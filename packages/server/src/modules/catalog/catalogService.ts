import { unlink } from "node:fs/promises";
import { join } from "node:path";

import { HttpError, Service } from "najm-core";
import { Transaction } from "najm-database";

import { envConfig } from "../../config/envConfig";
import { AuditService } from "../audit/auditService";
import {
  CATEGORY_IMAGE_SERVE_PREFIX,
} from "./categoryImageController";
import {
  PRODUCT_IMAGE_SERVE_PREFIX,
} from "./productImageController";
import {
  type CategoryListQuery,
  categoryListQuery,
  type CreateCategoryDto,
  createCategoryDto,
  type CreateProductDto,
  createProductDto,
  type ProductListQuery,
  productListQuery,
  type StatusReasonDto,
  statusReasonDto,
  type UpdateCategoryDto,
  updateCategoryDto,
  type UpdateProductDto,
  updateProductDto,
} from "./catalogDto";
import {
  CategoryRepository,
  ProductRepository,
} from "./catalogRepository";
import { CatalogValidator } from "./catalogValidator";

@Service()
export class CatalogService {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly products: ProductRepository,
    private readonly audits: AuditService,
    private readonly validator: CatalogValidator,
  ) {}

  async listCategories(query: CategoryListQuery) {
    const { limit, offset, ...filters } = categoryListQuery.parse(query ?? {});
    const categoryRows = await this.categories.list(limit, offset, filters);
    return categoryRows.map((category) => ({
      ...category,
      itemCount: Number(category.itemCount ?? 0),
    }));
  }

  async listActiveCategories(query: CategoryListQuery) {
    const { limit, offset } = categoryListQuery.parse(query ?? {});
    const categoryRows = await this.categories.listActive(limit, offset);
    return categoryRows.map((category) => ({
      ...category,
      itemCount: Number(category.itemCount ?? 0),
    }));
  }

  getCategory(id: string) {
    return this.validator.ensureCategoryExists(id);
  }

  listProducts(query: ProductListQuery) {
    const { limit, offset, ...filters } = productListQuery.parse(query ?? {});
    return this.products.list(limit, offset, filters);
  }

  listActiveProducts(query: ProductListQuery) {
    const { limit, offset, ...filters } = productListQuery.parse(query ?? {});
    return this.products.listActive(limit, offset, filters);
  }

  getProduct(id: string) {
    return this.validator.ensureProductExists(id);
  }

  getActiveProduct(id: string) {
    return this.validator.ensureActiveProduct(id);
  }

  @Transaction({ retries: 2 })
  async createCategory(data: CreateCategoryDto, actorUserId: string) {
    const input = createCategoryDto.parse(data);
    const category = await this.categories.create({
      ...input,
      description: input.description ?? null,
      image: input.image ?? null,
      status: "active",
    });
    await this.audits.record({
      action: "catalog.categoryCreated",
      actorUserId,
      metadata: { slug: category.slug },
      resource: "categories",
      resourceId: category.id,
    });
    return category;
  }

  @Transaction({ retries: 2 })
  async updateCategory(
    id: string,
    data: UpdateCategoryDto,
    actorUserId: string,
  ) {
    await this.validator.ensureCategoryExists(id);
    const input = updateCategoryDto.parse(data);
    const category = await this.categories.update(id, {
      ...input,
      description: input.description === undefined ? undefined : input.description ?? null,
      image: input.image === undefined ? undefined : input.image ?? null,
    });
    await this.audits.record({
      action: "catalog.categoryUpdated",
      actorUserId,
      metadata: {},
      resource: "categories",
      resourceId: id,
    });
    return category;
  }

  @Transaction({ retries: 2 })
  async setCategoryStatus(
    id: string,
    status: "active" | "inactive",
    data: StatusReasonDto,
    actorUserId: string,
  ) {
    await this.validator.ensureCategoryExists(id);
    const { reason } = statusReasonDto.parse(data);
    const category = await this.categories.setStatus(id, status);
    await this.audits.record({
      action: `catalog.category${status === "active" ? "Activated" : "Deactivated"}`,
      actorUserId,
      metadata: { reason },
      resource: "categories",
      resourceId: id,
    });
    return category;
  }

  @Transaction({ retries: 2 })
  async createProduct(data: CreateProductDto, actorUserId: string) {
    const input = createProductDto.parse(data);
    await this.validator.ensureActiveCategory(input.categoryId);
    const product = await this.products.create({
      ...input,
      description: input.description ?? null,
      imageUrl: input.imageUrl ?? null,
      currency: "MAD",
      status: "active",
    });
    await this.audits.record({
      action: "catalog.productCreated",
      actorUserId,
      metadata: { sku: product.sku, priceMinor: product.priceMinor },
      resource: "products",
      resourceId: product.id,
    });
    return product;
  }

  @Transaction({ retries: 2 })
  async updateProduct(
    id: string,
    data: UpdateProductDto,
    actorUserId: string,
  ) {
    await this.validator.ensureProductExists(id);
    const input = updateProductDto.parse(data);
    if (input.categoryId) {
      await this.validator.ensureActiveCategory(input.categoryId);
    }
    const product = await this.products.update(id, {
      ...input,
      description: input.description === undefined ? undefined : input.description ?? null,
      imageUrl: input.imageUrl === undefined ? undefined : input.imageUrl ?? null,
    });
    await this.audits.record({
      action: "catalog.productUpdated",
      actorUserId,
      metadata: { priceChanged: input.priceMinor !== undefined },
      resource: "products",
      resourceId: id,
    });
    return product;
  }

  @Transaction({ retries: 2 })
  async setProductStatus(
    id: string,
    status: "active" | "inactive",
    data: StatusReasonDto,
    actorUserId: string,
  ) {
    const product = await this.validator.ensureProductExists(id);
    if (status === "active") {
      await this.validator.ensureActiveCategory(product.categoryId);
    }
    const { reason } = statusReasonDto.parse(data);
    const updated = await this.products.setStatus(id, status);
    await this.audits.record({
      action: `catalog.product${status === "active" ? "Activated" : "Deactivated"}`,
      actorUserId,
      metadata: { reason },
      resource: "products",
      resourceId: id,
    });
    return updated;
  }

  /**
   * Hard-delete a pristine product (no order history). Cart items referencing
   * it are removed before the product row. Image cleanup is reported to the
   * caller so it runs once the surrounding transaction has committed.
   *
   * Kafil is procurement-on-demand, so a product with no inventory balance
   * is valid. The legacy inventory history tables are never queried here.
   */
  @Transaction({ retries: 2 })
  async deleteProduct(id: string, actorUserId: string) {
    const product = await this.validator.ensureProductExists(id);
    await this.validator.ensureProductPristine(id);
    await this.products.deleteCartItemsByProductIds([product.id]);
    const deleted = await this.products.hardDelete(id);
    if (!deleted) {
      HttpError.notFound("Product not found");
    }
    await this.audits.record({
      action: "catalog.productDeleted",
      actorUserId,
      metadata: { permanent: true },
      resource: "products",
      resourceId: id,
    });
    return {
      productId: id,
      categoryId: product.categoryId,
      productImageUrl: deleted.imageUrl ?? null,
    };
  }

  /**
   * Hard-delete a pristine category. Cascades its empty products (each of
   * which must satisfy the product-pristineness rules) and their cart items.
   * Returns descriptors of every removed image so the controller can unlink
   * them after commit.
   */
  @Transaction({ retries: 2 })
  async deleteCategory(id: string, actorUserId: string) {
    await this.validator.ensureCategoryExists(id);
    await this.validator.ensureCategoryPristine(id);

    const productsUnder = await this.products.lockByCategoryIdForDelete(id);
    const productIds = productsUnder.map((p) => p.id);

    if (productIds.length > 0) {
      await this.products.deleteCartItemsByProductIds(productIds);
      await this.products.hardDeleteByIds(productIds);
    }
    const deleted = await this.categories.hardDelete(id);
    if (!deleted) {
      HttpError.notFound("Category not found");
    }
    await this.audits.record({
      action: "catalog.categoryDeleted",
      actorUserId,
      metadata: { permanent: true, deletedProductIds: productIds },
      resource: "categories",
      resourceId: id,
    });
    return {
      categoryId: id,
      categoryImagePath: deleted.image ?? null,
      deletedProductIds: productIds,
      deletedProductImages: productsUnder
        .map((p) => p.imageUrl)
        .filter((u): u is string => Boolean(u)),
    };
  }

  /**
   * Best-effort post-commit image cleanup. Intentionally NOT in the
   * transaction — filesystem unlink cannot be rolled back if the DB transaction
   * commits and the file deletion later fails, so we run only AFTER the
   * transaction has succeeded. Any ENOENT or read-only error is swallowed (the
   * DB is already the source of truth); other errors are logged via console
   * for ops visibility.
   */
  async cleanupImagesAfterCommit(input: {
    categoryImagePath?: string | null;
    deletedProductImages?: string[];
  }) {
    const paths: string[] = [];
    if (input.categoryImagePath) {
      paths.push(...catalogImagePathsFromUrl(input.categoryImagePath));
    }
    for (const url of input.deletedProductImages ?? []) {
      paths.push(...productImagePathsFromUrl(url));
    }
    await Promise.all(
      paths.map((path) =>
        unlink(path).catch((error: NodeJS.ErrnoException) => {
          if (error.code !== "ENOENT") {
            console.warn(
              `[catalog] failed to clean up image ${path}:`,
              error.message,
            );
          }
        }),
      ),
    );
  }
}

const FILE_NAME_REGEX = /^[0-9a-f-]{36}\.(?:avif|gif|jpg|png|webp)$/i;

function catalogImagePathsFromUrl(url: string): string[] {
  if (!url || !url.startsWith(CATEGORY_IMAGE_SERVE_PREFIX)) return [];
  const fileName = decodeURIComponent(url.slice(CATEGORY_IMAGE_SERVE_PREFIX.length));
  if (!FILE_NAME_REGEX.test(fileName)) return [];
  return [join(envConfig.storage.basePath, "category-images", fileName)];
}

function productImagePathsFromUrl(url: string): string[] {
  if (!url || !url.startsWith(PRODUCT_IMAGE_SERVE_PREFIX)) return [];
  const fileName = decodeURIComponent(url.slice(PRODUCT_IMAGE_SERVE_PREFIX.length));
  if (!FILE_NAME_REGEX.test(fileName)) return [];
  return [join(envConfig.storage.basePath, "product-images", fileName)];
}
