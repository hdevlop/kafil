import { HttpError, Service } from "najm-core";
import { Transaction } from "najm-database";

import { AuditService } from "../audit/auditService";
import {
  type CategoryListQuery,
  categoryListQuery,
  type CreateCategoryDto,
  createCategoryDto,
  type CreateProductDto,
  createProductDto,
  type InventoryAdjustmentDto,
  inventoryAdjustmentDto,
  type InventoryLedgerListQuery,
  inventoryLedgerListQuery,
  type ProductListQuery,
  productListQuery,
  type RestockDto,
  restockDto,
  type StatusReasonDto,
  statusReasonDto,
  type UpdateCategoryDto,
  updateCategoryDto,
  type UpdateProductDto,
  updateProductDto,
} from "./catalogDto";
import {
  CategoryRepository,
  InventoryRepository,
  ProductRepository,
} from "./catalogRepository";
import { CatalogValidator } from "./catalogValidator";

export interface InventoryReservationInput {
  productId: string;
  quantity: number;
  sourceId: string;
  idempotencyKey: string;
}

@Service()
export class CatalogService {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly products: ProductRepository,
    private readonly inventory: InventoryRepository,
    private readonly audits: AuditService,
    private readonly validator: CatalogValidator,
  ) {}

  listCategories(query: CategoryListQuery) {
    const { limit, offset, ...filters } = categoryListQuery.parse(query ?? {});
    return this.categories.list(limit, offset, filters);
  }

  listActiveCategories(query: CategoryListQuery) {
    const { limit, offset } = categoryListQuery.parse(query ?? {});
    return this.categories.listActive(limit, offset);
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

  async getInventory(productId: string) {
    await this.validator.ensureProductExists(productId);
    return this.validator.ensureBalance(productId);
  }

  async listInventoryLedger(
    productId: string,
    query: InventoryLedgerListQuery,
  ) {
    const { limit, offset } = inventoryLedgerListQuery.parse(query ?? {});
    await this.validator.ensureProductExists(productId);
    return this.inventory.listLedger(productId, limit, offset);
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
    await this.inventory.createForProduct(product.id);
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

  @Transaction({ retries: 2 })
  async restock(productId: string, data: RestockDto, actorUserId: string) {
    const input = restockDto.parse(data);
    return this.changeInventory({
      productId,
      quantity: input.quantity,
      onHandDelta: input.quantity,
      reservedDelta: 0,
      entryType: "restock",
      sourceType: "stock_receipt",
      sourceId: productId,
      idempotencyKey: input.idempotencyKey,
      reason: input.reason,
      actorUserId,
    });
  }

  @Transaction({ retries: 2 })
  async adjustInventory(
    productId: string,
    data: InventoryAdjustmentDto,
    actorUserId: string,
  ) {
    const input = inventoryAdjustmentDto.parse(data);
    return this.changeInventory({
      productId,
      quantity: input.quantity,
      onHandDelta: input.quantity,
      reservedDelta: 0,
      entryType: "adjustment",
      sourceType: "manual_adjustment",
      sourceId: productId,
      idempotencyKey: input.idempotencyKey,
      reason: input.reason,
      actorUserId,
    });
  }

  @Transaction({ retries: 2 })
  reserve(input: InventoryReservationInput) {
    return this.changeInventory({
      ...input,
      onHandDelta: 0,
      reservedDelta: input.quantity,
      entryType: "order_reserve",
      sourceType: "order",
      reason: null,
      actorUserId: null,
    });
  }

  @Transaction({ retries: 2 })
  release(input: InventoryReservationInput) {
    return this.changeInventory({
      ...input,
      quantity: -input.quantity,
      onHandDelta: 0,
      reservedDelta: -input.quantity,
      entryType: "order_release",
      sourceType: "order",
      reason: null,
      actorUserId: null,
    });
  }

  @Transaction({ retries: 2 })
  allocate(input: InventoryReservationInput) {
    return this.changeInventory({
      ...input,
      quantity: -input.quantity,
      onHandDelta: -input.quantity,
      reservedDelta: -input.quantity,
      entryType: "order_allocate",
      sourceType: "order",
      reason: null,
      actorUserId: null,
    });
  }

  @Transaction({ retries: 2 })
  returnAllocated(input: InventoryReservationInput) {
    return this.changeInventory({
      ...input,
      onHandDelta: input.quantity,
      reservedDelta: 0,
      entryType: "order_return",
      sourceType: "order",
      reason: null,
      actorUserId: null,
    });
  }

  private async changeInventory(input: {
    productId: string;
    quantity: number;
    onHandDelta: number;
    reservedDelta: number;
    entryType:
      | "restock"
      | "adjustment"
      | "order_reserve"
      | "order_release"
      | "order_allocate"
      | "order_return";
    sourceType: string;
    sourceId: string;
    idempotencyKey: string;
    reason: string | null;
    actorUserId: string | null;
  }) {
    await this.validator.ensureProductExists(input.productId);
    const existing = await this.inventory.findLedgerByIdempotencyKey(
      input.idempotencyKey,
    );
    if (existing) {
      this.validator.ensureSameProduct(input.productId, existing.productId);
      return existing;
    }
    await this.inventory.createForProduct(input.productId);
    const balance = await this.inventory.lockByProductId(input.productId);
    if (!balance) {
      HttpError.notFound("Inventory balance not found");
    }
    const repeated = await this.inventory.findLedgerByIdempotencyKey(
      input.idempotencyKey,
    );
    if (repeated) {
      this.validator.ensureSameProduct(input.productId, repeated.productId);
      return repeated;
    }
    const next = applyInventoryDelta(balance, {
      onHandQuantity: input.onHandDelta,
      reservedQuantity: input.reservedDelta,
    });
    const updated = await this.inventory.updateBalance(input.productId, next);
    if (!updated) {
      HttpError.notFound("Inventory balance not found");
    }
    const entry = await this.inventory.appendLedger({
      productId: input.productId,
      entryType: input.entryType,
      quantity: input.quantity,
      onHandAfter: updated.onHandQuantity,
      reservedAfter: updated.reservedQuantity,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      idempotencyKey: input.idempotencyKey,
      actorUserId: input.actorUserId,
      reason: input.reason,
    });
    if (input.actorUserId) {
      await this.audits.record({
        action: `inventory.${input.entryType}`,
        actorUserId: input.actorUserId,
        metadata: { quantity: input.quantity },
        resource: "inventoryLedgerEntries",
        resourceId: entry.id,
      });
    }
    return entry;
  }
}

function applyInventoryDelta(
  balance: { onHandQuantity: number; reservedQuantity: number },
  delta: { onHandQuantity: number; reservedQuantity: number },
) {
  const next = {
    onHandQuantity: balance.onHandQuantity + delta.onHandQuantity,
    reservedQuantity: balance.reservedQuantity + delta.reservedQuantity,
  };
  if (
    !Number.isSafeInteger(next.onHandQuantity) ||
    !Number.isSafeInteger(next.reservedQuantity) ||
    next.onHandQuantity < 0 ||
    next.reservedQuantity < 0 ||
    next.reservedQuantity > next.onHandQuantity
  ) {
    HttpError.conflict("Inventory change would violate stock availability");
  }
  return next;
}
