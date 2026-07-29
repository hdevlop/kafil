import { afterEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  type CategorySeedService,
  prepareCategorySeedImages,
  seedCatalogCategories,
  validateCategorySeedImages,
} from "../src/category-seed";
import { CATEGORY_SEED_FIXTURES } from "../src/category-fixtures";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  );
});

describe("catalog category seed", () => {
  it("defines unique app categories backed by packaged image names", () => {
    expect(CATEGORY_SEED_FIXTURES).toHaveLength(18);
    expect(new Set(CATEGORY_SEED_FIXTURES.map(({ slug }) => slug)).size).toBe(18);
    expect(
      new Set(CATEGORY_SEED_FIXTURES.map(({ fileName }) => fileName)).size,
    ).toBe(18);
    expect(CATEGORY_SEED_FIXTURES.map(({ slug }) => slug)).toContain(
      "fresh-produce",
    );
    expect(CATEGORY_SEED_FIXTURES.map(({ slug }) => slug)).toContain("toys");
  });

  it("validates and copies every category image to a stable managed URL", async () => {
    const { libraryPath, storagePath } = await temporaryCategoryLibrary();
    const first = await prepareCategorySeedImages({ libraryPath, storagePath });
    const second = await prepareCategorySeedImages({ libraryPath, storagePath });

    expect(await validateCategorySeedImages(libraryPath)).toHaveLength(18);
    expect(first).toHaveLength(18);
    expect(first.map(({ image }) => image)).toEqual(
      second.map(({ image }) => image),
    );
    for (const category of first) {
      expect(category.image).toMatch(
        /^\/api\/category-images\/files\/serve\/[0-9a-f-]{36}\.webp$/,
      );
    }
  });

  it("inserts, skips, and repairs categories idempotently", async () => {
    const { libraryPath, storagePath } = await temporaryCategoryLibrary();
    const records: Array<{
      description: string | null;
      id: string;
      image: string | null;
      name: string;
      slug: string;
      sortOrder: number;
      status: "active" | "inactive";
    }> = [];
    const service: CategorySeedService = {
      async listCategories() {
        return records;
      },
      async createCategory(data) {
        const record = {
          description: String(data.description),
          id: `category-${records.length + 1}`,
          image: String(data.image),
          name: String(data.name),
          slug: String(data.slug),
          sortOrder: Number(data.sortOrder),
          status: "active" as const,
        };
        records.push(record);
        return record;
      },
      async updateCategory(id, data) {
        const record = records.find((candidate) => candidate.id === id)!;
        Object.assign(record, data);
        return record;
      },
      async setCategoryStatus(id, status) {
        const record = records.find((candidate) => candidate.id === id)!;
        record.status = status;
        return record;
      },
    };

    expect(
      await seedCatalogCategories(service, "actor", { libraryPath, storagePath }),
    ).toEqual({ inserted: 18, repaired: 0, skipped: 0 });
    expect(
      await seedCatalogCategories(service, "actor", { libraryPath, storagePath }),
    ).toEqual({ inserted: 0, repaired: 0, skipped: 18 });

    records[0]!.name = "Stale name";
    records[0]!.status = "inactive";
    expect(
      await seedCatalogCategories(service, "actor", { libraryPath, storagePath }),
    ).toEqual({ inserted: 0, repaired: 1, skipped: 17 });
    expect(records[0]!.name).toBe("Fresh Produce");
    expect(String(records[0]!.status)).toBe("active");
  });
});

async function temporaryCategoryLibrary() {
  const root = await mkdtemp(join(tmpdir(), "kafil-category-seed-"));
  temporaryDirectories.push(root);
  const libraryPath = join(root, "images");
  const storagePath = join(root, "storage");
  await mkdir(libraryPath, { recursive: true });
  await Promise.all(
    CATEGORY_SEED_FIXTURES.map(async ({ fileName }) =>
      writeFile(
        join(libraryPath, fileName),
        await readFile(
          join(import.meta.dir, "..", "images", "child-f-01.webp"),
        ),
      ),
    ),
  );
  return { libraryPath, storagePath };
}
