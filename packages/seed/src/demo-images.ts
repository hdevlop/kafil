import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, stat } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { envConfig } from "@kafil/server/config";
import {
  FAMILY_IMAGE_SERVE_PREFIX,
  SPONSOR_IMAGE_SERVE_PREFIX,
} from "@kafil/server/modules";

import type { DemoSeedData } from "./scripts/demo/generator";

const MAX_IMAGE_BYTES = 5_000_000;
const LIBRARY_NOTE_FILES = new Set([".gitkeep", ".ds_store", "readme.md"]);
const PROFILE_IMAGE_NAME =
  /^(family|sponsor)-(\d{2,})\.(avif|gif|jpe?g|png|webp)$/i;

export const DEFAULT_DEMO_IMAGE_LIBRARY_PATH = fileURLToPath(
  new URL("../images/", import.meta.url),
);

export interface DemoImageLibrary {
  families: string[];
  sponsors: string[];
}

export interface DemoImageSummary {
  families: { assigned: number; available: number };
  sponsors: { assigned: number; available: number };
}

interface DemoImageOptions {
  libraryPath?: string;
  storagePath?: string;
}

export async function readDemoImageLibrary(
  libraryPath = DEFAULT_DEMO_IMAGE_LIBRARY_PATH,
): Promise<DemoImageLibrary> {
  await mkdir(libraryPath, { recursive: true });
  const entries = await readdir(libraryPath, { withFileTypes: true });
  const unsupported = entries.filter(
    (entry) =>
      entry.isDirectory() ||
      (entry.isFile() &&
        !LIBRARY_NOTE_FILES.has(entry.name.toLowerCase()) &&
        !PROFILE_IMAGE_NAME.test(entry.name)),
  );
  if (unsupported.length > 0) {
    throw new Error(
      `Unsupported seed image entries in '${libraryPath}': ${unsupported
        .map((entry) => entry.name)
        .sort()
        .join(", ")}. Use flat family-NN.ext and sponsor-NN.ext files only.`,
    );
  }

  const indexed = {
    families: [] as Array<{ index: number; path: string }>,
    sponsors: [] as Array<{ index: number; path: string }>,
  };
  const usedIndexes = {
    family: new Set<number>(),
    sponsor: new Set<number>(),
  };

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const match = PROFILE_IMAGE_NAME.exec(entry.name);
    if (!match) continue;
    const kind = match[1]!.toLowerCase() as "family" | "sponsor";
    const index = Number(match[2]);
    if (usedIndexes[kind].has(index)) {
      throw new Error(
        `Duplicate seed image number '${kind}-${match[2]}' in '${libraryPath}'.`,
      );
    }
    usedIndexes[kind].add(index);
    indexed[kind === "family" ? "families" : "sponsors"].push({
      index,
      path: join(libraryPath, entry.name),
    });
  }

  const sortImages = (images: Array<{ index: number; path: string }>) =>
    images
      .sort(
        (left, right) =>
          left.index - right.index || left.path.localeCompare(right.path, "en"),
      )
      .map((image) => image.path);
  const library = {
    families: sortImages(indexed.families),
    sponsors: sortImages(indexed.sponsors),
  };

  for (const image of [...library.families, ...library.sponsors]) {
    const info = await stat(image);
    if (info.size === 0 || info.size > MAX_IMAGE_BYTES) {
      throw new Error(`Seed image '${image}' must be between 1 byte and 5 MB.`);
    }
  }

  return library;
}

export async function prepareDemoProfileImages(
  data: DemoSeedData,
  options: DemoImageOptions = {},
): Promise<{ data: DemoSeedData; summary: DemoImageSummary }> {
  const libraryPath = options.libraryPath ?? DEFAULT_DEMO_IMAGE_LIBRARY_PATH;
  const storagePath = options.storagePath ?? envConfig.storage.basePath;
  const library = await readDemoImageLibrary(libraryPath);
  const families = await assignImages({
    records: data.families,
    sources: library.families,
    storageDirectory: join(storagePath, "family-images"),
    servePrefix: FAMILY_IMAGE_SERVE_PREFIX,
  });
  const sponsors = await assignImages({
    records: data.sponsors,
    sources: library.sponsors,
    storageDirectory: join(storagePath, "sponsor-images"),
    servePrefix: SPONSOR_IMAGE_SERVE_PREFIX,
  });

  return {
    data: { ...data, families: families.records, sponsors: sponsors.records },
    summary: {
      families: {
        assigned: families.assigned,
        available: library.families.length,
      },
      sponsors: {
        assigned: sponsors.assigned,
        available: library.sponsors.length,
      },
    },
  };
}

async function assignImages<T extends { id: string }>(options: {
  records: readonly T[];
  servePrefix: string;
  sources: readonly string[];
  storageDirectory: string;
}) {
  const { records, servePrefix, sources, storageDirectory } = options;
  if (records.length === 0 || sources.length === 0) {
    return { assigned: 0, records: [...records] };
  }

  await mkdir(storageDirectory, { recursive: true });
  const assignedRecords: T[] = [];
  const sourceContents = new Map(
    await Promise.all(
      sources.map(async (source) => [source, await readFile(source)] as const),
    ),
  );
  let assigned = 0;

  for (const [index, record] of records.entries()) {
    const source = sources[index];
    if (!source) {
      assignedRecords.push(record);
      continue;
    }
    const sourceExtension = extname(source).toLowerCase();
    const extension = sourceExtension === ".jpeg" ? ".jpg" : sourceExtension;
    const fileName = `${contentUuid(record.id, sourceContents.get(source)!)}${extension}`;
    await copyFile(source, join(storageDirectory, fileName));
    assignedRecords.push({
      ...record,
      image: `${servePrefix}${encodeURIComponent(fileName)}`,
    });
    assigned += 1;
  }

  return { assigned, records: assignedRecords };
}

function contentUuid(recordId: string, contents: Uint8Array) {
  const digest = createHash("sha256")
    .update(recordId)
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
