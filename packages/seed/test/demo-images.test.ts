import { afterEach, describe, expect, it } from "bun:test";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile as writeRawFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  prepareDemoProfileImages,
  readDemoImageLibrary,
} from "../src/demo-images";
import { generateDemoSeedData } from "../src/scripts/demo/generator";

const temporaryDirectories: string[] = [];
const testImageDirectory = join(import.meta.dir, "..", "images");

async function writeFile(path: string, marker: string) {
  const source = marker.includes("two") ? "family-02.webp" : "family-01.webp";
  await writeRawFile(path, await readFile(join(testImageDirectory, source)));
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  );
});

describe("demo profile images", () => {
  it("copies a neutral sorted family library into managed storage", async () => {
    const root = await temporaryRoot();
    const libraryPath = join(root, "images");
    const storagePath = join(root, "storage");
    await mkdir(libraryPath, { recursive: true });
    await writeFile(join(libraryPath, "family-02.jpeg"), "family-two");
    await writeFile(join(libraryPath, "family-01.png"), "family-one");
    await writeFile(join(libraryPath, "sponsor-m-01.webp"), "sponsor-m-one");

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
      child: {
        F: { assigned: 0, files: 0, records: 2 },
        M: { assigned: 0, files: 0, records: 4 },
      },
      family: { assigned: 2, files: 2, records: 3 },
      sponsor: {
        F: { assigned: 0, files: 0, records: 1 },
        M: { assigned: 1, files: 1, records: 1 },
      },
    });
    const familyImages = data.families.map((family) => family.image);
    expect(familyImages).toHaveLength(3);
    expect(familyImages[0]).toMatch(
      /^\/api\/family-images\/files\/serve\/[0-9a-f-]{36}\.webp$/,
    );
    expect(familyImages[1]).toMatch(
      /^\/api\/family-images\/files\/serve\/[0-9a-f-]{36}\.webp$/,
    );
    expect(familyImages[2]).toBeUndefined();
    expect(data.sponsors[0]!.image).toMatch(
      /^\/api\/sponsor-images\/files\/serve\/[0-9a-f-]{36}\.webp$/,
    );
    expect(data.sponsors[1]!.image).toBeUndefined();
    const firstFamilyFile = familyImages[0]!.slice(
      familyImages[0]!.lastIndexOf("/") + 1,
    );
    expect(
      (await readFile(join(storagePath, "family-images", firstFamilyFile))).subarray(
        0,
        4,
      ).toString("ascii"),
    ).toBe("RIFF");
  });

  it("does not split family images by gender", async () => {
    const root = await temporaryRoot();
    const libraryPath = join(root, "images");
    await mkdir(libraryPath, { recursive: true });
    await writeFile(join(libraryPath, "family-01.png"), "family-one");

    const library = await readDemoImageLibrary(libraryPath);
    expect(Array.isArray(library.family)).toBe(true);
    expect(library.family).toHaveLength(1);
  });

  it("rejects gender-tagged family filenames", async () => {
    const root = await temporaryRoot();
    const libraryPath = join(root, "images");
    await mkdir(libraryPath, { recursive: true });
    await writeFile(join(libraryPath, "family-f-01.png"), "stale-tagged");
    await writeFile(join(libraryPath, "family-m-01.png"), "stale-tagged");

    await expect(readDemoImageLibrary(libraryPath)).rejects.toThrow(
      "Unsupported seed image entries",
    );
  });

  it("rejects unsupported and nested library entries", async () => {
    const root = await temporaryRoot();
    const libraryPath = join(root, "images");
    await mkdir(join(libraryPath, "nested"), { recursive: true });
    await writeFile(join(libraryPath, "family.png"), "bad name");
    await writeFile(join(libraryPath, "sponsor-01.png"), "legacy sponsor");

    await expect(readDemoImageLibrary(libraryPath)).rejects.toThrow(
      "Unsupported seed image entries",
    );
  });

  it("rejects duplicate numeric positions per kind and gender", async () => {
    const root = await temporaryRoot();
    const libraryPath = join(root, "images");
    await mkdir(libraryPath, { recursive: true });
    await writeFile(join(libraryPath, "sponsor-f-01.png"), "first");
    await writeFile(join(libraryPath, "sponsor-f-01.webp"), "duplicate");

    await expect(readDemoImageLibrary(libraryPath)).rejects.toThrow(
      "Duplicate seed image number 'sponsor-f-01'",
    );
  });

  it("accepts the same family number once across the neutral pool", async () => {
    const root = await temporaryRoot();
    const libraryPath = join(root, "images");
    await mkdir(libraryPath, { recursive: true });
    await writeFile(join(libraryPath, "family-01.png"), "family-one");
    await writeFile(join(libraryPath, "family-01.webp"), "family-one-webp");

    await expect(readDemoImageLibrary(libraryPath)).rejects.toThrow(
      "Duplicate seed image number 'family-01'",
    );
  });

  it("exhausts one sponsor pool without borrowing from the other", async () => {
    const root = await temporaryRoot();
    const libraryPath = join(root, "images");
    const storagePath = join(root, "storage");
    await mkdir(libraryPath, { recursive: true });
    await writeFile(join(libraryPath, "sponsor-f-01.png"), "sponsor-f-one");
    await writeFile(join(libraryPath, "sponsor-m-01.png"), "sponsor-m-one");
    await writeFile(join(libraryPath, "sponsor-m-02.png"), "sponsor-m-two");

    const generated = generateDemoSeedData({
      contributions: 0,
      families: 0,
      operators: 0,
      sponsors: 6,
    });
    const { data, summary } = await prepareDemoProfileImages(generated, {
      libraryPath,
      storagePath,
    });
    const femaleImages = data.sponsors
      .filter((sponsor) => sponsor.gender === "F")
      .map((sponsor) => sponsor.image);
    const maleImages = data.sponsors
      .filter((sponsor) => sponsor.gender === "M")
      .map((sponsor) => sponsor.image);
    expect(femaleImages.filter(Boolean)).toHaveLength(1);
    expect(femaleImages.filter((image) => !image)).toHaveLength(2);
    expect(maleImages.filter(Boolean)).toHaveLength(2);
    expect(maleImages.filter((image) => !image)).toHaveLength(1);
    expect(summary.sponsor.F.files).toBe(1);
    expect(summary.sponsor.M.files).toBe(2);
  });

  it("assigns family images by stable sorted order regardless of guardian gender", async () => {
    const root = await temporaryRoot();
    const libraryPath = join(root, "images");
    const storagePath = join(root, "storage");
    await mkdir(libraryPath, { recursive: true });
    await writeFile(join(libraryPath, "family-01.png"), "family-one");
    await writeFile(join(libraryPath, "family-02.png"), "family-two");

    const generated = generateDemoSeedData({
      contributions: 0,
      families: 2,
      operators: 0,
      sponsors: 0,
    });
    const { data } = await prepareDemoProfileImages(generated, {
      libraryPath,
      storagePath,
    });
    expect(data.families[0]!.guardianGender).toBe("F");
    expect(data.families[1]!.guardianGender).toBe("M");
    expect(data.families[0]!.image).toMatch(/family-images/);
    expect(data.families[1]!.image).toMatch(/family-images/);

    const firstFamilyFile = data.families[0]!.image!.slice(
      data.families[0]!.image!.lastIndexOf("/") + 1,
    );
    const secondFamilyFile = data.families[1]!.image!.slice(
      data.families[1]!.image!.lastIndexOf("/") + 1,
    );
    const firstContent = await readFile(
      join(storagePath, "family-images", firstFamilyFile),
    );
    const secondContent = await readFile(
      join(storagePath, "family-images", secondFamilyFile),
    );
    const sortedIds = [...data.families]
      .map((family) => family.id)
      .sort();
    const sortedFirstFile = data.families
      .find((family) => family.id === sortedIds[0])!
      .image!.slice(
        data.families
          .find((family) => family.id === sortedIds[0])!
          .image!.lastIndexOf("/") + 1,
      );
    const sortedFirstContent = await readFile(
      join(storagePath, "family-images", sortedFirstFile),
    );
    expect(sortedFirstContent).toEqual(firstContent);
    expect(firstContent.byteLength).toBeGreaterThan(0);
    expect(secondContent.byteLength).toBeGreaterThan(0);
    expect(firstContent).not.toEqual(secondContent);
  });

  it("keeps a family image stable when its guardian gender flips", async () => {
    const root = await temporaryRoot();
    const libraryPath = join(root, "images");
    const storagePath = join(root, "storage");
    await mkdir(libraryPath, { recursive: true });
    await writeFile(join(libraryPath, "family-01.png"), "family-one");
    await writeFile(join(libraryPath, "family-02.png"), "family-two");

    const counts = {
      contributions: 0,
      families: 2,
      operators: 0,
      sponsors: 0,
    };
    const reference = new Date("2026-07-20T10:00:00.000Z");
    const original = generateDemoSeedData(counts, reference);
    const flipped = {
      ...original,
      families: original.families.map((family) => ({
        ...family,
        guardianGender: family.guardianGender === "F" ? ("M" as const) : ("F" as const),
        relationshipToChildren:
          family.guardianGender === "F" ? "Father" : "Mother",
      })),
    };

    const originalResult = await prepareDemoProfileImages(original, {
      libraryPath,
      storagePath,
    });
    const flippedResult = await prepareDemoProfileImages(flipped, {
      libraryPath,
      storagePath,
    });

    for (const originalFamily of originalResult.data.families) {
      const flippedFamily = flippedResult.data.families.find(
        (family) => family.id === originalFamily.id,
      );
      expect(flippedFamily).toBeDefined();
      expect(flippedFamily!.image).toBe(originalFamily.image);
      expect(flippedFamily!.guardianGender).not.toBe(
        originalFamily.guardianGender,
      );
    }
  });

  it("produces stable destination filenames for the same input", async () => {
    const root = await temporaryRoot();
    const libraryPath = join(root, "images");
    const storagePath = join(root, "storage");
    await mkdir(libraryPath, { recursive: true });
    await writeFile(join(libraryPath, "family-01.png"), "family-one");

    const generated = generateDemoSeedData({
      contributions: 0,
      families: 1,
      operators: 0,
      sponsors: 0,
    });
    const first = await prepareDemoProfileImages(generated, {
      libraryPath,
      storagePath,
    });
    const second = await prepareDemoProfileImages(generated, {
      libraryPath,
      storagePath,
    });
    expect(first.data.families[0]!.image).toBe(
      second.data.families[0]!.image,
    );
  });

  it("assigns child images only from the matching gender pool", async () => {
    const root = await temporaryRoot();
    const libraryPath = join(root, "images");
    const storagePath = join(root, "storage");
    await mkdir(libraryPath, { recursive: true });
    await writeFile(join(libraryPath, "child-f-01.png"), "child-f-one");
    await writeFile(join(libraryPath, "child-f-02.png"), "child-f-two");
    await writeFile(join(libraryPath, "child-m-01.png"), "child-m-one");

    const generated = generateDemoSeedData({
      contributions: 0,
      families: 4,
      operators: 0,
      sponsors: 0,
    });
    const { data, summary } = await prepareDemoProfileImages(generated, {
      libraryPath,
      storagePath,
    });
    const allChildren = data.families.flatMap((family) => family.initialChildren);
    expect(allChildren.length).toBeGreaterThan(0);
    const femaleChildren = allChildren.filter((child) => child.gender === "F");
    const maleChildren = allChildren.filter((child) => child.gender === "M");
    expect(femaleChildren.length).toBeGreaterThan(0);
    expect(maleChildren.length).toBeGreaterThan(0);
    for (const child of femaleChildren) {
      if (child.image) {
        expect(child.image).toMatch(/^\/api\/child-images\/files\/serve\//);
      }
    }
    for (const child of maleChildren) {
      if (child.image) {
        expect(child.image).toMatch(/^\/api\/child-images\/files\/serve\//);
      }
    }
    const expectedFemaleAssigned = Math.min(femaleChildren.length, 2);
    const expectedMaleAssigned = Math.min(maleChildren.length, 1);
    expect(summary.child.F.assigned).toBe(expectedFemaleAssigned);
    expect(summary.child.F.records).toBe(femaleChildren.length);
    expect(summary.child.F.files).toBe(2);
    expect(summary.child.M.assigned).toBe(expectedMaleAssigned);
    expect(summary.child.M.records).toBe(maleChildren.length);
    expect(summary.child.M.files).toBe(1);
  });

  it("exhausts one child pool without borrowing from the other", async () => {
    const root = await temporaryRoot();
    const libraryPath = join(root, "images");
    const storagePath = join(root, "storage");
    await mkdir(libraryPath, { recursive: true });
    await writeFile(join(libraryPath, "child-f-01.png"), "child-f-one");
    await writeFile(join(libraryPath, "child-m-01.png"), "child-m-one");

    const generated = generateDemoSeedData({
      contributions: 0,
      families: 4,
      operators: 0,
      sponsors: 0,
    });
    const { data } = await prepareDemoProfileImages(generated, {
      libraryPath,
      storagePath,
    });
    const allChildren = data.families.flatMap((family) => family.initialChildren);
    const femaleChildren = allChildren.filter((child) => child.gender === "F");
    const maleChildren = allChildren.filter((child) => child.gender === "M");
    expect(femaleChildren.length).toBeGreaterThan(1);
    expect(maleChildren.length).toBeGreaterThan(1);
    const femaleWithImage = femaleChildren.filter((child) => Boolean(child.image)).length;
    const maleWithImage = maleChildren.filter((child) => Boolean(child.image)).length;
    expect(femaleWithImage).toBe(1);
    expect(maleWithImage).toBe(1);
    expect(femaleChildren.length - femaleWithImage).toBeGreaterThan(0);
    expect(maleChildren.length - maleWithImage).toBeGreaterThan(0);
  });

  it("produces stable child image destinations for the same data", async () => {
    const root = await temporaryRoot();
    const libraryPath = join(root, "images");
    const storagePath = join(root, "storage");
    await mkdir(libraryPath, { recursive: true });
    await writeFile(join(libraryPath, "child-f-01.png"), "child-f-one");
    await writeFile(join(libraryPath, "child-m-01.png"), "child-m-one");

    const generated = generateDemoSeedData({
      contributions: 0,
      families: 3,
      operators: 0,
      sponsors: 0,
    });
    const first = await prepareDemoProfileImages(generated, {
      libraryPath,
      storagePath,
    });
    const second = await prepareDemoProfileImages(generated, {
      libraryPath,
      storagePath,
    });
    const firstChildren = first.data.families.flatMap((family) => family.initialChildren);
    const secondChildren = second.data.families.flatMap((family) => family.initialChildren);
    expect(firstChildren.map((child) => child.image)).toEqual(
      secondChildren.map((child) => child.image),
    );
  });

  it("derives child destination names from family id and child index", async () => {
    const root = await temporaryRoot();
    const libraryPath = join(root, "images");
    const storagePath = join(root, "storage");
    await mkdir(libraryPath, { recursive: true });
    await writeFile(join(libraryPath, "child-f-01.png"), "child-f-one");
    await writeFile(join(libraryPath, "child-m-01.png"), "child-m-one");

    const generated = generateDemoSeedData({
      contributions: 0,
      families: 4,
      operators: 0,
      sponsors: 0,
    });
    const { data } = await prepareDemoProfileImages(generated, {
      libraryPath,
      storagePath,
    });

    const childImages = data.families.flatMap((family) =>
      family.initialChildren.map((child) => child.image),
    );
    const distinctImages = new Set(childImages.filter(Boolean));
    const expectedDistinct = new Set(
      childImages.filter((value) => Boolean(value)),
    );
    expect(distinctImages.size).toBe(expectedDistinct.size);
  });

  it("preserves per-family child destination identity when family order changes", async () => {
    const root = await temporaryRoot();
    const libraryPath = join(root, "images");
    const storagePath = join(root, "storage");
    await mkdir(libraryPath, { recursive: true });
    await writeFile(join(libraryPath, "child-f-01.png"), "child-f-one");
    await writeFile(join(libraryPath, "child-m-01.png"), "child-m-one");

    const counts = {
      contributions: 0,
      families: 4,
      operators: 0,
      sponsors: 0,
    };
    const reference = new Date("2026-07-20T10:00:00.000Z");
    const first = generateDemoSeedData(counts, reference);
    const second = generateDemoSeedData(counts, reference);
    const reversed = {
      ...second,
      families: [...second.families].reverse(),
    };

    const firstResult = await prepareDemoProfileImages(first, {
      libraryPath,
      storagePath,
    });
    const reversedResult = await prepareDemoProfileImages(reversed, {
      libraryPath,
      storagePath,
    });

    const imageByFamily = new Map<string, string[]>();
    for (const family of firstResult.data.families) {
      imageByFamily.set(
        family.id,
        family.initialChildren.map((child) => child.image ?? ""),
      );
    }
    for (const family of reversedResult.data.families) {
      const expected = imageByFamily.get(family.id);
      expect(expected).toBeDefined();
      const actual = family.initialChildren.map((child) => child.image ?? "");
      expect(actual).toEqual(expected ?? []);
    }
  });

  it("keeps a missing child pool empty without affecting other pools", async () => {
    const root = await temporaryRoot();
    const libraryPath = join(root, "images");
    const storagePath = join(root, "storage");
    await mkdir(libraryPath, { recursive: true });
    await writeFile(join(libraryPath, "child-m-01.png"), "child-m-one");

    const generated = generateDemoSeedData({
      contributions: 0,
      families: 3,
      operators: 0,
      sponsors: 0,
    });
    const { data, summary } = await prepareDemoProfileImages(generated, {
      libraryPath,
      storagePath,
    });
    const allChildren = data.families.flatMap((family) => family.initialChildren);
    const femaleChildren = allChildren.filter((child) => child.gender === "F");
    const maleChildren = allChildren.filter((child) => child.gender === "M");
    expect(femaleChildren.every((child) => child.image === undefined)).toBe(true);
    expect(summary.child.F.assigned).toBe(0);
    expect(summary.child.F.files).toBe(0);
    expect(maleChildren.some((child) => Boolean(child.image))).toBe(true);
  });
});

async function temporaryRoot() {
  const directory = await mkdtemp(join(tmpdir(), "kafil-seed-images-"));
  temporaryDirectories.push(directory);
  return directory;
}
