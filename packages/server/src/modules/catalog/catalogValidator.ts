import { HttpError, Service } from "najm-core";

import { catalogNotPristine, type PristinenessBlock } from "./catalogErrors";
import {
  CategoryRepository,
  InventoryRepository,
  ProductRepository,
} from "./catalogRepository";

@Service()
export class CatalogValidator {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly products: ProductRepository,
    private readonly inventory: InventoryRepository,
  ) {}

  async ensureCategoryExists(id: string) {
    const category = await this.categories.findById(id);
    if (!category) {
      HttpError.notFound("Category not found");
    }
    return category;
  }

  async ensureActiveCategory(id: string) {
    const category = await this.ensureCategoryExists(id);
    if (category.status !== "active") {
      HttpError.conflict("Category is inactive");
    }
    return category;
  }

  async ensureProductExists(id: string) {
    const product = await this.products.findById(id);
    if (!product) {
      HttpError.notFound("Product not found");
    }
    return product;
  }

  async ensureActiveProduct(id: string) {
    const product = await this.products.findActiveById(id);
    if (!product) {
      HttpError.notFound("Active product not found");
    }
    return product;
  }

  async ensureBalance(productId: string) {
    const balance = await this.inventory.findByProductId(productId);
    if (!balance) {
      HttpError.notFound("Inventory balance not found");
    }
    return balance;
  }

  ensureSameProduct(expectedProductId: string, actualProductId: string) {
    if (expectedProductId !== actualProductId) {
      HttpError.conflict("Idempotency key was already used for another product");
    }
  }

  /** A product is "pristine" iff: no order_items reference it, no
   *  inventory_ledger_entries reference it, and its inventory balance is
   *  either absent or 0/0. Otherwise throw 409 with the offending blockers. */
  async ensureProductPristine(productId: string): Promise<void> {
    const product = await this.products.findById(productId);
    if (!product) {
      HttpError.notFound("Product not found");
    }
    const orderCount = await this.products.countOrderItemsByProductIds([
      product.id,
    ]);
    const ledgerCount =
      await this.products.countInventoryLedgerByProductIds([product.id]);
    const balances = await this.inventory.lockBalancesByProductIds([
      product.id,
    ]);
    const blockers: PristinenessBlock[] = [];
    if (orderCount > 0) {
      blockers.push({
        productId: product.id,
        productName: product.name,
        reason: "order_history",
      });
    }
    if (ledgerCount > 0) {
      blockers.push({
        productId: product.id,
        productName: product.name,
        reason: "inventory_ledger",
      });
    }
    for (const balance of balances) {
      if (balance.onHandQuantity !== 0 || balance.reservedQuantity !== 0) {
        blockers.push({
          productId: product.id,
          productName: product.name,
          reason: "non_zero_balance",
          onHandQuantity: balance.onHandQuantity,
          reservedQuantity: balance.reservedQuantity,
        });
      }
    }
    if (blockers.length > 0) {
      catalogNotPristine(blockers);
    }
  }

  /** A category is "pristine" iff it has no products, or every product under
   *  it satisfies ensureProductPristine. */
  async ensureCategoryPristine(categoryId: string): Promise<void> {
    const productsUnder = await this.products.lockByCategoryIdForDelete(
      categoryId,
    );
    if (!productsUnder.length) return;
    const productIds = productsUnder.map((p) => p.id);
    const orderedProductIds =
      await this.products.productIdsWithOrderHistory(productIds);
    const ledgerProductIds =
      await this.products.productIdsWithInventoryLedger(productIds);
    const balances =
      await this.inventory.lockBalancesByProductIds(productIds);
    const blockers: PristinenessBlock[] = [];
    const lookup = new Map(productsUnder.map((p) => [p.id, p.name]));

    for (const productId of orderedProductIds) {
      blockers.push({
        productId,
        productName: lookup.get(productId) ?? productId,
        reason: "order_history",
      });
    }
    for (const productId of ledgerProductIds) {
      blockers.push({
        productId,
        productName: lookup.get(productId) ?? productId,
        reason: "inventory_ledger",
      });
    }
    for (const balance of balances) {
      if (balance.onHandQuantity !== 0 || balance.reservedQuantity !== 0) {
        blockers.push({
          productId: balance.productId,
          productName: lookup.get(balance.productId) ?? balance.productId,
          reason: "non_zero_balance",
          onHandQuantity: balance.onHandQuantity,
          reservedQuantity: balance.reservedQuantity,
        });
      }
    }
    if (blockers.length > 0) {
      catalogNotPristine(blockers);
    }
  }
}
