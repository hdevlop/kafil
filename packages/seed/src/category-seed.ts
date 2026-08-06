import { createHash } from "node:crypto";
import { mkdir, readFile, stat } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { envConfig } from "@kafil/server/config";
import {
  assertManagedImageCompliant,
  detectManagedImageMime,
  writeManagedImage,
} from "@kafil/server/managed-images";
import {
  CATEGORY_IMAGE_SERVE_PREFIX,
  type CreateCategoryDto,
  type UpdateCategoryDto,
} from "@kafil/server/modules";

import {
  CATEGORY_SEED_FIXTURES,
  type CategorySeedFixture,
} from "./category-fixtures";

export const DEFAULT_CATEGORY_IMAGE_LIBRARY_PATH = fileURLToPath(
  new URL("../images/", import.meta.url),
);

interface CategorySeedRecord {
  description: string | null;
  id: string;
  image: string | null;
  name: string;
  slug: string;
  sortOrder: number;
  status: "active" | "inactive";
}

interface SeedCategoryInput {
  description: string;
  image: string;
  name: string;
  slug: string;
  sortOrder: number;
}

export interface CategorySeedService {
  createCategory(data: CreateCategoryDto, actorUserId: string): Promise<CategorySeedRecord>;
  // The catalog service reports a result total alongside the rows, so the seed
  // reads the same page envelope every list endpoint now returns.
  listCategories(
    query: { limit: number; offset: number },
  ): Promise<{ data: CategorySeedRecord[] }>;
  setCategoryStatus(
    id: string,
    status: "active" | "inactive",
    data: { reason: string },
    actorUserId: string,
  ): Promise<CategorySeedRecord>;
  updateCategory(id: string, data: UpdateCategoryDto, actorUserId: string): Promise<CategorySeedRecord>;
}

export interface CategorySeedOptions {
  libraryPath?: string;
  storagePath?: string;
}

export interface CategorySeedResult {
  inserted: number;
  repaired: number;
  skipped: number;
}

interface PreparedCategory extends CategorySeedFixture {
  image: string;
}

export async function seedCatalogCategories(
  service: CategorySeedService,
  actorUserId: string,
  options: CategorySeedOptions = {},
): Promise<CategorySeedResult> {
  const prepared = await prepareCategorySeedImages(options);
  const { data: existing } = await service.listCategories({ limit: 100, offset: 0 });
  const bySlug = new Map(existing.map((category) => [category.slug, category]));
  const result: CategorySeedResult = { inserted: 0, repaired: 0, skipped: 0 };

  for (const fixture of prepared) {
    const category = bySlug.get(fixture.slug);
    const desired = categoryInput(fixture);
    if (!category) {
      const created = await service.createCategory(desired, actorUserId);
      bySlug.set(created.slug, created);
      result.inserted += 1;
      continue;
    }

    let repaired = false;
    if (categoryNeedsRepair(category, desired)) {
      await service.updateCategory(category.id, desired, actorUserId);
      repaired = true;
    }
    if (category.status !== "active") {
      await service.setCategoryStatus(
        category.id,
        "active",
        { reason: "Restore the packaged category seed fixture." },
        actorUserId,
      );
      repaired = true;
    }

    if (repaired) result.repaired += 1;
    else result.skipped += 1;
  }

  return result;
}

export async function prepareCategorySeedImages(
  options: CategorySeedOptions = {},
): Promise<PreparedCategory[]> {
  const libraryPath = options.libraryPath ?? DEFAULT_CATEGORY_IMAGE_LIBRARY_PATH;
  const storagePath = options.storagePath ?? envConfig.storage.basePath;
  const storageDirectory = join(storagePath, "category-images");
  await mkdir(storageDirectory, { recursive: true });

  return Promise.all(
    CATEGORY_SEED_FIXTURES.map(async (fixture) => {
      const source = join(libraryPath, fixture.fileName);
      const sourceStat = await stat(source).catch(() => undefined);
      if (!sourceStat?.isFile()) {
        throw new Error(`Missing category seed image '${fixture.fileName}'.`);
      }
      const contents = await readFile(source);
      await assertManagedImageCompliant(contents, "catalog");
      const extension = extname(fixture.fileName).toLowerCase();
      const fileName = `${contentUuid(`category:${fixture.slug}`, contents)}${extension}`;
      const managed = await writeManagedImage({
        bytes: contents,
        declaredMime: detectManagedImageMime(contents),
        directory: storageDirectory,
        profile: "catalog",
        requestedFileName: fileName,
        reuseExisting: true,
        servePrefix: CATEGORY_IMAGE_SERVE_PREFIX,
      });

      return {
        ...fixture,
        image: managed.path,
      };
    }),
  );
}

export async function validateCategorySeedImages(
  libraryPath = DEFAULT_CATEGORY_IMAGE_LIBRARY_PATH,
) {
  const paths: string[] = [];
  for (const fixture of CATEGORY_SEED_FIXTURES) {
    const source = join(libraryPath, fixture.fileName);
    const sourceStat = await stat(source).catch(() => undefined);
    if (!sourceStat?.isFile()) {
      throw new Error(`Missing category seed image '${fixture.fileName}'.`);
    }
    await assertManagedImageCompliant(
      new Uint8Array(await readFile(source)),
      "catalog",
    );
    paths.push(source);
  }
  return paths;
}

function categoryInput(fixture: PreparedCategory): SeedCategoryInput {
  return {
    name: fixture.name,
    slug: fixture.slug,
    description: fixture.description,
    image: fixture.image,
    sortOrder: fixture.sortOrder,
  };
}

function categoryNeedsRepair(
  category: CategorySeedRecord,
  desired: SeedCategoryInput,
) {
  return (
    category.name !== desired.name ||
    category.description !== desired.description ||
    category.image !== desired.image ||
    category.sortOrder !== desired.sortOrder
  );
}

function contentUuid(recordKey: string, contents: Uint8Array) {
  const digest = createHash("sha256").update(recordKey).update(contents).digest("hex");
  const variant = ((Number.parseInt(digest[16]!, 16) & 0x3) | 0x8).toString(16);

  return [
    digest.slice(0, 8),
    digest.slice(8, 12),
    `4${digest.slice(13, 16)}`,
    `${variant}${digest.slice(17, 20)}`,
    digest.slice(20, 32),
  ].join("-");
}
