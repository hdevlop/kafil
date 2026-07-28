import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, stat } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { envConfig } from "@kafil/server/config";
import {
  CHILD_IMAGE_SERVE_PREFIX,
  FAMILY_IMAGE_SERVE_PREFIX,
  SPONSOR_IMAGE_SERVE_PREFIX,
} from "@kafil/server/modules";

import type { DemoChild, DemoSeedData } from "./scripts/demo/generator";
import { isCategorySeedImageName } from "./category-fixtures";

const MAX_IMAGE_BYTES = 5_000_000;
const LIBRARY_NOTE_FILES = new Set([".gitkeep", ".ds_store", "readme.md"]);
const LIBRARY_DIRECTORIES = new Set(["_unclassified"]);

const FAMILY_IMAGE_NAME = /^family-(\d{2,})\.(avif|gif|jpe?g|png|webp)$/i;
const GENDERED_IMAGE_NAME =
  /^(sponsor|child)-(f|m)-(\d{2,})\.(avif|gif|jpe?g|png|webp)$/i;

export const DEFAULT_DEMO_IMAGE_LIBRARY_PATH = fileURLToPath(
  new URL("../images/", import.meta.url),
);

export type DemoImageKind = "family" | "sponsor" | "child";
export type DemoImageGender = "F" | "M";

export interface DemoImageLibrary {
  child: { F: string[]; M: string[] };
  family: string[];
  sponsor: { F: string[]; M: string[] };
}

export interface DemoImagePoolSummary {
  assigned: number;
  files: number;
  records: number;
}

export interface DemoImageGenderSummary {
  F: DemoImagePoolSummary;
  M: DemoImagePoolSummary;
}

export interface DemoImageSummary {
  child: DemoImageGenderSummary;
  family: DemoImagePoolSummary;
  sponsor: DemoImageGenderSummary;
}

export interface DemoImageAssignmentResult {
  data: DemoSeedData;
  summary: DemoImageSummary;
}

interface AssignOptions<T> {
  getKey: (record: T) => string;
  records: readonly T[];
  servePrefix: string;
  sources: readonly string[];
  storageDirectory: string;
}

interface AssignResult<T> {
  assigned: number;
  files: number;
  records: T[];
}

interface AssignedChild extends DemoChild {
  demoKey: string;
}

interface AssignChildGenderResult {
  assigned: number;
  files: number;
  children: AssignedChild[];
}

export async function readDemoImageLibrary(
  libraryPath = DEFAULT_DEMO_IMAGE_LIBRARY_PATH,
): Promise<DemoImageLibrary> {
  await mkdir(libraryPath, { recursive: true });
  const entries = await readdir(libraryPath, { withFileTypes: true });
  const unsupported = entries.filter(
    (entry) =>
      (entry.isDirectory() &&
        !LIBRARY_DIRECTORIES.has(entry.name.toLowerCase())) ||
      (entry.isFile() &&
        !LIBRARY_NOTE_FILES.has(entry.name.toLowerCase()) &&
        !isCategorySeedImageName(entry.name) &&
        !FAMILY_IMAGE_NAME.test(entry.name) &&
        !GENDERED_IMAGE_NAME.test(entry.name)),
  );
  if (unsupported.length > 0) {
    throw new Error(
      `Unsupported seed image entries in '${libraryPath}': ${unsupported
        .map((entry) => entry.name)
        .sort()
        .join(", ")}. Use packaged category filenames or flat family-NN.ext, sponsor-f-NN.ext, sponsor-m-NN.ext, child-f-NN.ext, and child-m-NN.ext files only.`,
    );
  }

  const familyIndexed: Array<{ index: number; path: string }> = [];
  const sponsorIndexed = { F: [] as Array<{ index: number; path: string }>, M: [] as Array<{ index: number; path: string }> };
  const childIndexed = { F: [] as Array<{ index: number; path: string }>, M: [] as Array<{ index: number; path: string }> };

  const familyNumbers = new Set<number>();
  const sponsorNumbers = { F: new Set<number>(), M: new Set<number>() };
  const childNumbers = { F: new Set<number>(), M: new Set<number>() };

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const familyMatch = FAMILY_IMAGE_NAME.exec(entry.name);
    if (familyMatch) {
      const index = Number(familyMatch[1]);
      if (familyNumbers.has(index)) {
        throw new Error(
          `Duplicate seed image number 'family-${familyMatch[1]}' in '${libraryPath}'.`,
        );
      }
      familyNumbers.add(index);
      familyIndexed.push({ index, path: join(libraryPath, entry.name) });
      continue;
    }
    const genderedMatch = GENDERED_IMAGE_NAME.exec(entry.name);
    if (!genderedMatch) continue;
    const kind = genderedMatch[1]!.toLowerCase() as "sponsor" | "child";
    const gender = genderedMatch[2]!.toUpperCase() as DemoImageGender;
    const number = genderedMatch[3]!;
    const index = Number(number);
    const usedNumbers = kind === "sponsor" ? sponsorNumbers : childNumbers;
    if (usedNumbers[gender].has(index)) {
      throw new Error(
        `Duplicate seed image number '${kind}-${genderedMatch[2]}-${number}' in '${libraryPath}'.`,
      );
    }
    usedNumbers[gender].add(index);
    const target = kind === "sponsor" ? sponsorIndexed : childIndexed;
    target[gender].push({ index, path: join(libraryPath, entry.name) });
  }

  const sortImages = (images: Array<{ index: number; path: string }>) =>
    images
      .sort(
        (left, right) =>
          left.index - right.index || left.path.localeCompare(right.path, "en"),
      )
      .map((image) => image.path);

  const library: DemoImageLibrary = {
    child: { F: sortImages(childIndexed.F), M: sortImages(childIndexed.M) },
    family: sortImages(familyIndexed),
    sponsor: { F: sortImages(sponsorIndexed.F), M: sortImages(sponsorIndexed.M) },
  };

  for (const image of [
    ...library.family,
    ...library.child.F,
    ...library.child.M,
    ...library.sponsor.F,
    ...library.sponsor.M,
  ]) {
    const info = await stat(image);
    if (info.size === 0 || info.size > MAX_IMAGE_BYTES) {
      throw new Error(
        `Seed image '${image}' must be between 1 byte and 5 MB.`,
      );
    }
  }

  return library;
}

export async function prepareDemoProfileImages(
  data: DemoSeedData,
  options: { libraryPath?: string; storagePath?: string } = {},
): Promise<DemoImageAssignmentResult> {
  const libraryPath = options.libraryPath ?? DEFAULT_DEMO_IMAGE_LIBRARY_PATH;
  const storagePath = options.storagePath ?? envConfig.storage.basePath;
  const library = await readDemoImageLibrary(libraryPath);

  const orderedFamilies = [...data.families].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
  const familyAssignment = await assignFamilyImages({
    records: orderedFamilies,
    sources: library.family,
    servePrefix: FAMILY_IMAGE_SERVE_PREFIX,
    storageDirectory: join(storagePath, "family-images"),
    getKey: (family) => family.id,
  });
  const familyById = new Map<string, (typeof orderedFamilies)[number]>();
  for (const family of familyAssignment.records) {
    familyById.set(family.id, family);
  }
  const nextFamilies = data.families.map((family) => familyById.get(family.id) ?? family);

  const orderedChildren = nextFamilies
    .flatMap((family) =>
      family.initialChildren.map((child, childIndex) => ({
        child,
        familyId: family.id,
        childIndex,
      })),
    )
    .sort(
      (left, right) =>
        left.familyId.localeCompare(right.familyId) ||
        left.childIndex - right.childIndex,
    );
  const childF = await assignChildGenderImages({
    children: orderedChildren,
    gender: "F",
    sources: library.child.F,
    storageDirectory: join(storagePath, "child-images"),
    getKey: (entry) => `${entry.familyId}:${entry.childIndex}`,
  });
  const childM = await assignChildGenderImages({
    children: orderedChildren,
    gender: "M",
    sources: library.child.M,
    storageDirectory: join(storagePath, "child-images"),
    getKey: (entry) => `${entry.familyId}:${entry.childIndex}`,
  });

  const childImages = new Map<string, string>();
  for (const child of [...childF.children, ...childM.children]) {
    if (child.image) childImages.set(child.demoKey, child.image);
  }
  const familiesWithChildren = nextFamilies.map((family) => ({
    ...family,
    initialChildren: family.initialChildren.map((child, childIndex) => {
      const image = childImages.get(`${family.id}:${childIndex}`);
      return image ? { ...child, image } : child;
    }),
  }));

  const sponsorF = await assignGenderImages({
    getKey: (sponsor) => sponsor.id,
    records: data.sponsors.filter((sponsor) => sponsor.gender === "F"),
    servePrefix: SPONSOR_IMAGE_SERVE_PREFIX,
    sources: library.sponsor.F,
    storageDirectory: join(storagePath, "sponsor-images"),
  });
  const sponsorM = await assignGenderImages({
    getKey: (sponsor) => sponsor.id,
    records: data.sponsors.filter((sponsor) => sponsor.gender === "M"),
    servePrefix: SPONSOR_IMAGE_SERVE_PREFIX,
    sources: library.sponsor.M,
    storageDirectory: join(storagePath, "sponsor-images"),
  });
  const sponsorById = new Map<string, (typeof data.sponsors)[number]>();
  for (const sponsor of [...sponsorF.records, ...sponsorM.records]) {
    sponsorById.set(sponsor.id, sponsor);
  }

  const allChildren = familiesWithChildren.flatMap(
    (family) => family.initialChildren,
  );
  const familyRecords = data.families;

  return {
    data: {
      ...data,
      families: familiesWithChildren,
      sponsors: data.sponsors.map(
        (sponsor) => sponsorById.get(sponsor.id) ?? sponsor,
      ),
    },
    summary: {
      child: {
        F: summarizeChildren(childF, "F", allChildren),
        M: summarizeChildren(childM, "M", allChildren),
      },
      family: {
        assigned: familyAssignment.assigned,
        files: library.family.length,
        records: familyRecords.length,
      },
      sponsor: {
        F: summarizePool(sponsorF),
        M: summarizePool(sponsorM),
      },
    },
  };
}

async function assignFamilyImages<T extends { id: string }>(
  options: AssignOptions<T>,
): Promise<AssignResult<T & { image?: string | null }>> {
  const { records, sources, storageDirectory, servePrefix, getKey } = options;
  if (records.length === 0 || sources.length === 0) {
    return { assigned: 0, files: sources.length, records: [...records] };
  }

  await mkdir(storageDirectory, { recursive: true });
  const sourceContents = new Map(
    await Promise.all(
      sources.map(async (source) => [source, await readFile(source)] as const),
    ),
  );
  let assigned = 0;
  const next: Array<T & { image?: string | null }> = [];

  for (const [index, record] of records.entries()) {
    const source = sources[index];
    if (!source) {
      next.push({ ...record });
      continue;
    }
    const sourceExtension = extname(source).toLowerCase();
    const extension = sourceExtension === ".jpeg" ? ".jpg" : sourceExtension;
    const fileName = `${contentUuid(getKey(record), sourceContents.get(source)!)}${extension}`;
    await copyFile(source, join(storageDirectory, fileName));
    next.push({
      ...record,
      image: `${servePrefix}${encodeURIComponent(fileName)}`,
    });
    assigned += 1;
  }

  return { assigned, files: sources.length, records: next };
}

async function assignGenderImages<T extends { id: string }>(
  options: AssignOptions<T>,
): Promise<AssignResult<T & { image?: string | null }>> {
  return assignFamilyImages(options);
}

async function assignChildGenderImages<
  T extends { child: DemoChild; familyId: string; childIndex: number },
>(
  options: {
    children: readonly T[];
    gender: "F" | "M";
    sources: readonly string[];
    storageDirectory: string;
    getKey: (entry: T) => string;
  },
): Promise<AssignChildGenderResult> {
  const { children, gender, sources, storageDirectory, getKey } = options;
  const matching = children
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => entry.child.gender === gender);
  if (matching.length === 0 || sources.length === 0) {
    return { assigned: 0, files: sources.length, children: [] };
  }

  await mkdir(storageDirectory, { recursive: true });
  const sourceContents = new Map(
    await Promise.all(
      sources.map(async (source) => [source, await readFile(source)] as const),
    ),
  );
  let assigned = 0;
  const next: AssignedChild[] = [];

  for (const [matchIndex, { entry, index }] of matching.entries()) {
    const source = sources[matchIndex];
    if (!source) continue;
    const sourceExtension = extname(source).toLowerCase();
    const extension = sourceExtension === ".jpeg" ? ".jpg" : sourceExtension;
    const demoKey = getKey(entry);
    const fileName = `${contentUuid(demoKey, sourceContents.get(source)!)}${extension}`;
    await copyFile(source, join(storageDirectory, fileName));
    next.push({
      ...entry.child,
      demoKey,
      image: `${CHILD_IMAGE_SERVE_PREFIX}${encodeURIComponent(fileName)}`,
    });
    assigned += 1;
    void index;
  }

  return { assigned, files: sources.length, children: next };
}

function summarizePool<T>(result: AssignResult<T>): DemoImagePoolSummary {
  return {
    assigned: result.assigned,
    files: result.files,
    records: result.records.length,
  };
}

function summarizeChildren(
  result: AssignChildGenderResult,
  gender: "F" | "M",
  nextChildren: readonly DemoChild[],
): DemoImagePoolSummary {
  const records = nextChildren.filter((child) => child.gender === gender).length;
  return {
    assigned: result.assigned,
    files: result.files,
    records,
  };
}

function contentUuid(recordKey: string, contents: Uint8Array) {
  const digest = createHash("sha256")
    .update(recordKey)
    .update(contents)
    .digest("hex");
  const variant = ((Number.parseInt(digest[16]!, 16) & 0x3) | 0x8).toString(16);

  return [
    digest.slice(0, 8),
    digest.slice(8, 12),
    `4${digest.slice(13, 16)}`,
    `${variant}${digest.slice(17, 20)}`,
    digest.slice(20, 32),
  ].join("-");
}
