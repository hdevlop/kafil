import { createHash } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";

import { envConfig } from "@kafil/server/config";
import {
  assertManagedImageCompliant,
  detectManagedImageMime,
  writeManagedImage,
} from "@kafil/server/managed-images";
import {
  PRODUCT_IMAGE_SERVE_PREFIX,
  type CreateProductDto,
  type UpdateProductDto,
} from "@kafil/server/modules";

import { DEFAULT_CATEGORY_IMAGE_LIBRARY_PATH } from "./category-seed";
import {
  DEMO_PRODUCT_FIXTURES,
  LEGACY_DEMO_PRODUCT_SKUS,
  type DemoProductFixture,
} from "./demo-product-fixtures";

interface DemoCategoryRecord {
  id: string;
  slug: string;
}

export interface DemoProductRecord {
  categoryId: string;
  description: string | null;
  id: string;
  imageUrl: string | null;
  name: string;
  priceMinor: number;
  sku: string;
  status: "active" | "inactive";
}

export interface DemoCatalogService {
  createProduct(
    data: CreateProductDto,
    actorUserId: string,
  ): Promise<DemoProductRecord>;
  listCategories(query: {
    limit: number;
    offset: number;
  }): Promise<DemoCategoryRecord[]>;
  listProducts(query: {
    limit: number;
    offset: number;
  }): Promise<DemoProductRecord[]>;
  setProductStatus(
    id: string,
    status: "active" | "inactive",
    data: { reason: string },
    actorUserId: string,
  ): Promise<DemoProductRecord>;
  updateProduct(
    id: string,
    data: UpdateProductDto,
    actorUserId: string,
  ): Promise<DemoProductRecord>;
}

export interface DemoCatalogOptions {
  libraryPath?: string;
  storagePath?: string;
}

export interface DemoCatalogSeedResult {
  inserted: number;
  repaired: number;
  retired: number;
  skipped: number;
}

interface PreparedDemoProduct extends DemoProductFixture {
  imageUrl: string;
}

export async function seedDemoCatalogProducts(
  service: DemoCatalogService,
  actorUserId: string,
  options: DemoCatalogOptions = {},
): Promise<DemoCatalogSeedResult> {
  const [categories, existing, prepared] = await Promise.all([
    service.listCategories({ limit: 100, offset: 0 }),
    service.listProducts({ limit: 100, offset: 0 }),
    prepareDemoProductImages(options),
  ]);
  const categoriesBySlug = new Map(
    categories.map((category) => [category.slug, category]),
  );
  const productsBySku = new Map(
    existing.map((product) => [product.sku, product]),
  );
  const result: DemoCatalogSeedResult = {
    inserted: 0,
    repaired: 0,
    retired: 0,
    skipped: 0,
  };

  for (const fixture of prepared) {
    const category = categoriesBySlug.get(fixture.categorySlug);
    if (!category) {
      throw new Error(
        `Demo product '${fixture.sku}' requires seeded category '${fixture.categorySlug}'.`,
      );
    }
    const desired = productInput(fixture, category.id);
    const product = productsBySku.get(fixture.sku);
    if (!product) {
      const created = await service.createProduct(desired, actorUserId);
      productsBySku.set(created.sku, created);
      result.inserted += 1;
      continue;
    }

    let repaired = false;
    if (productNeedsRepair(product, desired)) {
      await service.updateProduct(product.id, desired, actorUserId);
      repaired = true;
    }
    if (product.status !== "active") {
      await service.setProductStatus(
        product.id,
        "active",
        { reason: "Restore the managed demo catalog fixture." },
        actorUserId,
      );
      repaired = true;
    }

    if (repaired) result.repaired += 1;
    else result.skipped += 1;
  }

  const currentSkus = new Set(prepared.map((fixture) => fixture.sku));
  const legacySkus = new Set<string>(LEGACY_DEMO_PRODUCT_SKUS);
  for (const product of existing) {
    if (
      product.status !== "active" ||
      currentSkus.has(product.sku) ||
      !legacySkus.has(product.sku)
    ) {
      continue;
    }
    await service.setProductStatus(
      product.id,
      "inactive",
      { reason: "Retire a replaced generic demo catalog fixture." },
      actorUserId,
    );
    result.retired += 1;
  }

  return result;
}

export async function prepareDemoProductImages(
  options: DemoCatalogOptions = {},
): Promise<PreparedDemoProduct[]> {
  const libraryPath =
    options.libraryPath ?? DEFAULT_CATEGORY_IMAGE_LIBRARY_PATH;
  const storagePath = options.storagePath ?? envConfig.storage.basePath;
  const storageDirectory = join(storagePath, "product-images");
  await mkdir(storageDirectory, { recursive: true });

  return Promise.all(
    DEMO_PRODUCT_FIXTURES.map(async (fixture) => {
      const contents = new Uint8Array(
        await readFile(join(libraryPath, fixture.imageFileName)),
      );
      await assertManagedImageCompliant(contents, "catalog");
      const extension = extname(fixture.imageFileName).toLowerCase();
      const fileName = `${contentUuid(`product:${fixture.sku}`, contents)}${extension}`;
      const managed = await writeManagedImage({
        bytes: contents,
        declaredMime: detectManagedImageMime(contents),
        directory: storageDirectory,
        profile: "catalog",
        requestedFileName: fileName,
        reuseExisting: true,
        servePrefix: PRODUCT_IMAGE_SERVE_PREFIX,
      });
      return { ...fixture, imageUrl: managed.path };
    }),
  );
}

export async function validateDemoProductImages(
  libraryPath = DEFAULT_CATEGORY_IMAGE_LIBRARY_PATH,
) {
  return Promise.all(
    DEMO_PRODUCT_FIXTURES.map(async (fixture) => {
      const contents = new Uint8Array(
        await readFile(join(libraryPath, fixture.imageFileName)),
      );
      await assertManagedImageCompliant(contents, "catalog");
      return fixture.imageFileName;
    }),
  );
}

function productInput(
  fixture: PreparedDemoProduct,
  categoryId: string,
): CreateProductDto {
  return {
    categoryId,
    description: fixture.description,
    imageUrl: fixture.imageUrl,
    name: fixture.name,
    priceMinor: fixture.priceMinor,
    sku: fixture.sku,
  };
}

function productNeedsRepair(
  product: DemoProductRecord,
  desired: CreateProductDto,
) {
  return (
    product.categoryId !== desired.categoryId ||
    product.description !== desired.description ||
    product.imageUrl !== desired.imageUrl ||
    product.name !== desired.name ||
    product.priceMinor !== desired.priceMinor
  );
}

function contentUuid(recordKey: string, contents: Uint8Array) {
  const digest = createHash("sha256")
    .update(recordKey)
    .update(contents)
    .digest("hex");
  const variant = ((Number.parseInt(digest[16]!, 16) & 0x3) | 0x8).toString(
    16,
  );
  return [
    digest.slice(0, 8),
    digest.slice(8, 12),
    `4${digest.slice(13, 16)}`,
    `${variant}${digest.slice(17, 20)}`,
    digest.slice(20, 32),
  ].join("-");
}
