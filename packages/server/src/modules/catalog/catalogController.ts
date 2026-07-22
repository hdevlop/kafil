import { Body, Controller, Get, Params, Post, Put, Query, User,
  ResMsg,
} from "najm-core";
import { McpTool, ToolGroup } from "najm-mcp";
import { Validate } from "najm-validation";

import { isFamily, isOperator } from "../../config/authConfig";
import {
  type CategoryListQuery,
  categoryIdParams,
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
  productIdParams,
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
import { CatalogService } from "./catalogService";

@ToolGroup("catalog")
@Controller("/catalog")
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get("/browse/categories")
  @isFamily()
  @Validate({ query: categoryListQuery })
  @McpTool({ description: "List family-visible active product categories", readOnly: true })
  @ResMsg("catalog.success.retrieved")
  listActiveCategories(@Query() query: CategoryListQuery) {
    return this.catalog.listActiveCategories(query);
  }

  @Get("/browse/products")
  @isFamily()
  @Validate({ query: productListQuery })
  @McpTool({ description: "Search family-visible active catalog products", readOnly: true })
  @ResMsg("catalog.success.retrieved")
  listActiveProducts(@Query() query: ProductListQuery) {
    return this.catalog.listActiveProducts(query);
  }

  @Get("/browse/products/:id")
  @isFamily()
  @Validate({ params: productIdParams })
  @McpTool({ description: "Read a family-visible active product", readOnly: true })
  @ResMsg("catalog.success.retrieved")
  getActiveProduct(@Params("id") id: string) {
    return this.catalog.getActiveProduct(id);
  }

  @Get("/categories")
  @isOperator()
  @Validate({ query: categoryListQuery })
  @McpTool({ description: "List operator-managed catalog categories", readOnly: true })
  @ResMsg("catalog.success.retrieved")
  listCategories(@Query() query: CategoryListQuery) {
    return this.catalog.listCategories(query);
  }

  @Get("/categories/:id")
  @isOperator()
  @Validate({ params: categoryIdParams })
  @McpTool({ description: "Read an operator-managed catalog category", readOnly: true })
  @ResMsg("catalog.success.retrieved")
  getCategory(@Params("id") id: string) {
    return this.catalog.getCategory(id);
  }

  @Get("/products")
  @isOperator()
  @Validate({ query: productListQuery })
  @McpTool({ description: "List operator-managed catalog products", readOnly: true })
  @ResMsg("catalog.success.retrieved")
  listProducts(@Query() query: ProductListQuery) {
    return this.catalog.listProducts(query);
  }

  @Get("/products/:id")
  @isOperator()
  @Validate({ params: productIdParams })
  @McpTool({ description: "Read an operator-managed product", readOnly: true })
  @ResMsg("catalog.success.retrieved")
  getProduct(@Params("id") id: string) {
    return this.catalog.getProduct(id);
  }

  @Get("/products/:id/inventory")
  @isOperator()
  @Validate({ params: productIdParams })
  @McpTool({ description: "Read an operator-managed inventory balance", readOnly: true })
  @ResMsg("catalog.success.retrieved")
  getInventory(@Params("id") id: string) {
    return this.catalog.getInventory(id);
  }

  @Get("/products/:id/inventory/ledger")
  @isOperator()
  @Validate({ params: productIdParams, query: inventoryLedgerListQuery })
  @McpTool({ description: "Read an operator-managed inventory ledger", readOnly: true })
  @ResMsg("catalog.success.retrieved")
  listInventoryLedger(
    @Params("id") id: string,
    @Query() query: InventoryLedgerListQuery,
  ) {
    return this.catalog.listInventoryLedger(id, query);
  }

  @Post("/categories")
  @isOperator()
  @Validate({ body: createCategoryDto })
  @McpTool({ description: "Create an active product category", confirm: { level: "warning", message: "Create this category?" } })
  @ResMsg("catalog.success.created")
  createCategory(@Body() body: CreateCategoryDto, @User("id") userId: string) {
    return this.catalog.createCategory(body, userId);
  }

  @Put("/categories/:id")
  @isOperator()
  @Validate({ params: categoryIdParams, body: updateCategoryDto })
  @McpTool({ description: "Update a catalog category", confirm: { level: "warning", message: "Update this category?" } })
  @ResMsg("catalog.success.updated")
  updateCategory(
    @Params("id") id: string,
    @Body() body: UpdateCategoryDto,
    @User("id") userId: string,
  ) {
    return this.catalog.updateCategory(id, body, userId);
  }

  @Post("/categories/:id/activate")
  @isOperator()
  @Validate({ params: categoryIdParams, body: statusReasonDto })
  @McpTool({ description: "Activate a catalog category", confirm: { level: "warning", message: "Activate this category?" } })
  @ResMsg("catalog.success.activated")
  activateCategory(@Params("id") id: string, @Body() body: StatusReasonDto, @User("id") userId: string) {
    return this.catalog.setCategoryStatus(id, "active", body, userId);
  }

  @Post("/categories/:id/deactivate")
  @isOperator()
  @Validate({ params: categoryIdParams, body: statusReasonDto })
  @McpTool({ description: "Deactivate a category without deleting its history", destructive: true, confirm: { level: "danger", message: "Deactivate this category?" } })
  @ResMsg("catalog.success.deactivated")
  deactivateCategory(@Params("id") id: string, @Body() body: StatusReasonDto, @User("id") userId: string) {
    return this.catalog.setCategoryStatus(id, "inactive", body, userId);
  }

  @Post("/products")
  @isOperator()
  @Validate({ body: createProductDto })
  @McpTool({ description: "Create an active product and its inventory balance", confirm: { level: "warning", message: "Create this product?" } })
  @ResMsg("catalog.success.created")
  createProduct(@Body() body: CreateProductDto, @User("id") userId: string) {
    return this.catalog.createProduct(body, userId);
  }

  @Put("/products/:id")
  @isOperator()
  @Validate({ params: productIdParams, body: updateProductDto })
  @McpTool({ description: "Update a catalog product without rewriting order snapshots", confirm: { level: "warning", message: "Update this product?" } })
  @ResMsg("catalog.success.updated")
  updateProduct(@Params("id") id: string, @Body() body: UpdateProductDto, @User("id") userId: string) {
    return this.catalog.updateProduct(id, body, userId);
  }

  @Post("/products/:id/activate")
  @isOperator()
  @Validate({ params: productIdParams, body: statusReasonDto })
  @McpTool({ description: "Activate a catalog product", confirm: { level: "warning", message: "Activate this product?" } })
  @ResMsg("catalog.success.activated")
  activateProduct(@Params("id") id: string, @Body() body: StatusReasonDto, @User("id") userId: string) {
    return this.catalog.setProductStatus(id, "active", body, userId);
  }

  @Post("/products/:id/deactivate")
  @isOperator()
  @Validate({ params: productIdParams, body: statusReasonDto })
  @McpTool({ description: "Deactivate a product without deleting its history", destructive: true, confirm: { level: "danger", message: "Deactivate this product?" } })
  @ResMsg("catalog.success.deactivated")
  deactivateProduct(@Params("id") id: string, @Body() body: StatusReasonDto, @User("id") userId: string) {
    return this.catalog.setProductStatus(id, "inactive", body, userId);
  }

  @Post("/products/:id/inventory/restocks")
  @isOperator()
  @Validate({ params: productIdParams, body: restockDto })
  @McpTool({ description: "Record an idempotent stock receipt", idempotent: true, confirm: { level: "warning", message: "Record this stock receipt?" } })
  @ResMsg("catalog.success.restocked")
  restock(@Params("id") id: string, @Body() body: RestockDto, @User("id") userId: string) {
    return this.catalog.restock(id, body, userId);
  }

  @Post("/products/:id/inventory/adjustments")
  @isOperator()
  @Validate({ params: productIdParams, body: inventoryAdjustmentDto })
  @McpTool({ description: "Record an audited, idempotent stock adjustment", idempotent: true, confirm: { level: "danger", message: "Apply this stock adjustment?" } })
  @ResMsg("catalog.success.inventoryAdjusted")
  adjustInventory(@Params("id") id: string, @Body() body: InventoryAdjustmentDto, @User("id") userId: string) {
    return this.catalog.adjustInventory(id, body, userId);
  }
}
