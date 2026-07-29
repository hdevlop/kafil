import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import sharp from "sharp";

import {
  MANAGED_IMAGE_PROFILES,
  normalizeManagedImage,
  writeManagedImage,
  type ManagedImageProfileName,
} from "../src/storage/managedImages";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  );
});

async function temporaryDirectory() {
  const directory = await mkdtemp(join(tmpdir(), "kafil-managed-images-"));
  temporaryDirectories.push(directory);
  return directory;
}

async function png(width: number, height: number, alpha = 1) {
  return new Uint8Array(
    await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 43, g: 112, b: 88, alpha },
      },
    })
      .png()
      .toBuffer(),
  );
}

describe("managed image normalization", () => {
  for (const profileName of Object.keys(MANAGED_IMAGE_PROFILES) as ManagedImageProfileName[]) {
    it(`${profileName} produces verified bounded WebP`, async () => {
      const profile = MANAGED_IMAGE_PROFILES[profileName];
      const input = await png(2_000, 1_400);
      const output = await normalizeManagedImage(input, profileName, "image/png");
      const metadata = await sharp(output.bytes).metadata();

      expect(output.mime).toBe("image/webp");
      expect(output.bytes.byteLength).toBeLessThanOrEqual(profile.maxBytes);
      expect(metadata.format).toBe("webp");
      expect(metadata.width).toBeLessThanOrEqual(profile.maxWidth);
      expect(metadata.height).toBeLessThanOrEqual(profile.maxHeight);
      expect((metadata.width ?? 0) / (metadata.height ?? 1)).toBeCloseTo(10 / 7, 1);
    });
  }

  it("applies EXIF orientation and strips metadata", async () => {
    const input = new Uint8Array(
      await sharp({
        create: {
          width: 20,
          height: 40,
          channels: 3,
          background: "#336699",
        },
      })
        .jpeg()
        .withMetadata({ orientation: 6 })
        .toBuffer(),
    );
    const output = await normalizeManagedImage(input, "person", "image/jpeg");
    const metadata = await sharp(output.bytes).metadata();

    expect(metadata.width).toBe(40);
    expect(metadata.height).toBe(20);
    expect(metadata.orientation).toBeUndefined();
    expect(metadata.exif).toBeUndefined();
  });

  it("preserves alpha transparency", async () => {
    const output = await normalizeManagedImage(
      await png(320, 240, 0.35),
      "person",
      "image/png",
    );
    expect((await sharp(output.bytes).metadata()).hasAlpha).toBe(true);
  });

  it("rejects malformed content, mismatched MIME, GIF, and decoded pixel bombs", async () => {
    await expect(
      normalizeManagedImage(new Uint8Array([1, 2, 3]), "person", "image/png"),
    ).rejects.toThrow();
    await expect(
      normalizeManagedImage(await png(8, 8), "person", "image/jpeg"),
    ).rejects.toThrow();

    const gif = new Uint8Array(
      await sharp({
        create: {
          width: 8,
          height: 8,
          channels: 3,
          background: "#ffffff",
        },
      })
        .gif()
        .toBuffer(),
    );
    await expect(normalizeManagedImage(gif, "person", "image/gif")).rejects.toThrow();

    const bomb = await png(5_000, 5_000);
    expect(bomb.byteLength).toBeLessThan(5_000_000);
    await expect(normalizeManagedImage(bomb, "catalog", "image/png")).rejects.toThrow();
  });

  it("writes the final WebP atomically and leaves no candidate after failure", async () => {
    const directory = await temporaryDirectory();
    const requestedFileName = "11111111-1111-4111-8111-111111111111.png";
    const written = await writeManagedImage({
      bytes: await png(128, 128),
      declaredMime: "image/png",
      directory,
      profile: "person",
      requestedFileName,
      servePrefix: "/api/test/serve/",
    });

    expect(written.fileName).toBe("11111111-1111-4111-8111-111111111111.webp");
    expect(written.path).toEndWith(written.fileName);
    expect(await readdir(directory)).toEqual([written.fileName]);

    const emptyDirectory = await temporaryDirectory();
    await expect(
      writeManagedImage({
        bytes: new Uint8Array([1, 2, 3]),
        declaredMime: "image/png",
        directory: emptyDirectory,
        profile: "person",
        requestedFileName,
        servePrefix: "/api/test/serve/",
      }),
    ).rejects.toThrow();
    expect(await readdir(emptyDirectory)).toEqual([]);
  });
});
