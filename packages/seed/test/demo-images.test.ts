import { afterEach, describe, expect, it } from "bun:test";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  prepareDemoProfileImages,
  readDemoImageLibrary,
} from "../src/demo-images";
import { generateDemoSeedData } from "../src/scripts/demo/generator";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  );
});

describe("demo profile images", () => {
  it("copies sorted family and sponsor libraries into managed storage", async () => {
    const root = await temporaryRoot();
    const libraryPath = join(root, "images");
    const storagePath = join(root, "storage");
    await mkdir(libraryPath, { recursive: true });
    await writeFile(join(libraryPath, "family-02.jpeg"), "family-two");
    await writeFile(join(libraryPath, "family-01.png"), "family-one");
    await writeFile(join(libraryPath, "sponsor-01.webp"), "sponsor-one");

    const generated = generateDemoSeedData({
      contributions: 0,
      families: 3,
      operators: 0,
      sponsors: 2,
    });
    const { data, summary } = await prepareDemoProfileImages(generated, {
      libraryPath,
      storagePath,
    });

    expect(summary).toEqual({
      families: { assigned: 2, available: 2 },
      sponsors: { assigned: 1, available: 1 },
    });
    expect(data.families.map((family) => family.image)).toEqual([
      expect.stringMatching(/^\/api\/family-images\/files\/serve\/[0-9a-f-]{36}\.png$/),
      expect.stringMatching(/^\/api\/family-images\/files\/serve\/[0-9a-f-]{36}\.jpg$/),
      undefined,
    ]);
    expect(data.sponsors[0]!.image).toMatch(
      /^\/api\/sponsor-images\/files\/serve\/[0-9a-f-]{36}\.webp$/,
    );
    expect(data.sponsors[1]!.image).toBeUndefined();
    const secondFamilyFile = data.families[1]!.image!.slice(
      data.families[1]!.image!.lastIndexOf("/") + 1,
    );
    expect(
      await readFile(
        join(storagePath, "family-images", secondFamilyFile),
        "utf8",
      ),
    ).toBe("family-two");
  });

  it("rejects unsupported and nested library entries", async () => {
    const root = await temporaryRoot();
    const libraryPath = join(root, "images");
    await mkdir(join(libraryPath, "nested"), { recursive: true });
    await writeFile(join(libraryPath, "family.png"), "bad name");

    await expect(readDemoImageLibrary(libraryPath)).rejects.toThrow(
      "Unsupported seed image entries",
    );
  });

  it("rejects duplicate numeric positions for the same profile kind", async () => {
    const root = await temporaryRoot();
    const libraryPath = join(root, "images");
    await mkdir(libraryPath, { recursive: true });
    await writeFile(join(libraryPath, "family-01.png"), "first");
    await writeFile(join(libraryPath, "family-01.webp"), "duplicate");

    await expect(readDemoImageLibrary(libraryPath)).rejects.toThrow(
      "Duplicate seed image number 'family-01'",
    );
  });
});

async function temporaryRoot() {
  const directory = await mkdtemp(join(tmpdir(), "kafil-seed-images-"));
  temporaryDirectories.push(directory);
  return directory;
}
