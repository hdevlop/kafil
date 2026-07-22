import { HttpError, Service } from "najm-core";

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
}
