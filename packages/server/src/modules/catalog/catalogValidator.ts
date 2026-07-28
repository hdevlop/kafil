import { HttpError, Service } from "najm-core";

import { catalogNotPristine, type PristinenessBlock } from "./catalogErrors";
import {
  CategoryRepository,
  ProductRepository,
} from "./catalogRepository";

@Service()
export class CatalogValidator {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly products: ProductRepository,
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

  /** A product is pristine when it has no order or inventory-ledger history
   *  and no non-zero inventory balance. A zero balance is removable bookkeeping. */
  async ensureProductPristine(productId: string): Promise<void> {
    const product = await this.products.findById(productId);
    if (!product) {
      HttpError.notFound("Product not found");
    }
    const orderCount = await this.products.countOrderItemsByProductIds([
      product.id,
    ]);
    const inventoryHistory = await this.products.productIdsWithInventoryHistory([
      product.id,
    ]);
    const inventoryBalances = await this.products.inventoryBalancesByProductIds([
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
    if (inventoryHistory.length > 0) {
      blockers.push({
        productId: product.id,
        productName: product.name,
        reason: "inventory_history",
      });
    }
    if (
      inventoryBalances.some(
        (balance) =>
          balance.onHandQuantity !== 0 || balance.reservedQuantity !== 0,
      )
    ) {
      blockers.push({
        productId: product.id,
        productName: product.name,
        reason: "inventory_balance",
      });
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
    const inventoryHistoryProductIds =
      await this.products.productIdsWithInventoryHistory(productIds);
    const inventoryBalances =
      await this.products.inventoryBalancesByProductIds(productIds);
    const blockers: PristinenessBlock[] = [];
    const lookup = new Map(productsUnder.map((p) => [p.id, p.name]));

    for (const productId of orderedProductIds) {
      blockers.push({
        productId,
        productName: lookup.get(productId) ?? productId,
        reason: "order_history",
      });
    }
    for (const productId of inventoryHistoryProductIds) {
      blockers.push({
        productId,
        productName: lookup.get(productId) ?? productId,
        reason: "inventory_history",
      });
    }
    for (const balance of inventoryBalances) {
      if (balance.onHandQuantity === 0 && balance.reservedQuantity === 0) continue;
      blockers.push({
        productId: balance.productId,
        productName: lookup.get(balance.productId) ?? balance.productId,
        reason: "inventory_balance",
      });
    }
    if (blockers.length > 0) {
      catalogNotPristine(blockers);
    }
  }
}
