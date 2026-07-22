import {
  Body,
  Controller,
  Delete,
  Get,
  Params,
  Post,
  Put,
  Query,
  User,
  ResMsg,
} from "najm-core";
import { McpTool, ToolGroup } from "najm-mcp";
import { Validate } from "najm-validation";

import { isFamily, isOperator, isSponsor } from "../../config/authConfig";
import {
  type CartItemDto,
  cartItemDto,
  cartProductIdParams,
  type FamilyCancelOrderDto,
  familyCancelOrderDto,
  orderIdParams,
  type OrderListQuery,
  orderListQuery,
  type OrderReasonDto,
  orderReasonDto,
  type OwnOrderListQuery,
  ownOrderListQuery,
  type SetCartItemQuantityDto,
  setCartItemQuantityDto,
  type SubmitOrderDto,
  submitOrderDto,
} from "./orderDto";
import { OrderService } from "./orderService";

@ToolGroup("orders")
@Controller("/orders")
export class OrderController {
  constructor(private readonly orders: OrderService) {}

  @Get("/cart")
  @isFamily()
  @McpTool({ description: "Read or create the authenticated family's cart", readOnly: true })
  @ResMsg("orders.success.cartRetrieved")
  getOwnCart(@User("id") userId: string) {
    return this.orders.getOwnCart(userId);
  }

  @Post("/cart/items")
  @isFamily()
  @Validate({ body: cartItemDto })
  @McpTool({ description: "Add an active product to the authenticated family's cart", confirm: { level: "warning", message: "Add this item to the cart?" } })
  @ResMsg("orders.success.cartItemAdded")
  addCartItem(@Body() body: CartItemDto, @User("id") userId: string) {
    return this.orders.addCartItem(userId, body);
  }

  @Put("/cart/items/:productId")
  @isFamily()
  @Validate({ params: cartProductIdParams, body: setCartItemQuantityDto })
  @McpTool({ description: "Set an authenticated family's cart-item quantity", confirm: { level: "warning", message: "Update this cart quantity?" } })
  @ResMsg("orders.success.cartItemUpdated")
  setCartItemQuantity(
    @Params("productId") productId: string,
    @Body() body: SetCartItemQuantityDto,
    @User("id") userId: string,
  ) {
    return this.orders.setOwnCartItemQuantity(userId, productId, body);
  }

  @Delete("/cart/items/:productId")
  @isFamily()
  @Validate({ params: cartProductIdParams })
  @McpTool({ description: "Remove an item from the authenticated family's cart", destructive: true, confirm: { level: "warning", message: "Remove this cart item?" } })
  @ResMsg("orders.success.cartItemRemoved")
  removeCartItem(
    @Params("productId") productId: string,
    @User("id") userId: string,
  ) {
    return this.orders.removeOwnCartItem(userId, productId);
  }

  @Post("/cart/clear")
  @isFamily()
  @McpTool({ description: "Clear the authenticated family's cart", destructive: true, confirm: { level: "warning", message: "Clear the cart?" } })
  @ResMsg("orders.success.cartCleared")
  clearCart(@User("id") userId: string) {
    return this.orders.clearOwnCart(userId);
  }

  @Post("/submit")
  @isFamily()
  @Validate({ body: submitOrderDto })
  @McpTool({ description: "Submit the authenticated family's funded cart exactly once", idempotent: true, confirm: { level: "danger", message: "Submit this cart as an order?" } })
  @ResMsg("orders.success.submitted")
  submit(@Body() body: SubmitOrderDto, @User("id") userId: string) {
    return this.orders.submit(userId, body);
  }

  @Get("/me")
  @isFamily()
  @Validate({ query: ownOrderListQuery })
  @McpTool({ description: "List the authenticated family's own orders", readOnly: true })
  @ResMsg("orders.success.retrieved")
  listOwn(@User("id") userId: string, @Query() query: OwnOrderListQuery) {
    return this.orders.listOwn(userId, query);
  }

  @Get("/me/:id")
  @isFamily()
  @Validate({ params: orderIdParams })
  @McpTool({ description: "Read an authenticated family's own order and timeline", readOnly: true })
  @ResMsg("orders.success.retrieved")
  getOwn(@Params("id") id: string, @User("id") userId: string) {
    return this.orders.getOwn(id, userId);
  }

  @Post("/me/:id/cancel")
  @isFamily()
  @Validate({ params: orderIdParams, body: familyCancelOrderDto })
  @McpTool({ description: "Cancel the authenticated family's own pending order", idempotent: true, destructive: true, confirm: { level: "warning", message: "Cancel this pending order?" } })
  @ResMsg("orders.success.cancelled")
  cancelOwn(
    @Params("id") id: string,
    @Body() body: FamilyCancelOrderDto,
    @User("id") userId: string,
  ) {
    return this.orders.cancelOwn(id, body, userId);
  }

  @Get("/supported")
  @isSponsor()
  @Validate({ query: ownOrderListQuery })
  @McpTool({ description: "List privacy-safe order summaries for active supported families", readOnly: true })
  @ResMsg("orders.success.retrieved")
  listSupported(
    @User("id") userId: string,
    @Query() query: OwnOrderListQuery,
  ) {
    return this.orders.listSupported(userId, query);
  }

  @Get()
  @isOperator()
  @Validate({ query: orderListQuery })
  @McpTool({ description: "List operator-managed orders by household, state, or date", readOnly: true })
  @ResMsg("orders.success.retrieved")
  list(@Query() query: OrderListQuery) {
    return this.orders.list(query);
  }

  @Get("/:id")
  @isOperator()
  @Validate({ params: orderIdParams })
  @McpTool({ description: "Read an operator-managed order with snapshots and timeline", readOnly: true })
  @ResMsg("orders.success.retrieved")
  get(@Params("id") id: string) {
    return this.orders.get(id);
  }

  @Post("/:id/approve")
  @isOperator()
  @Validate({ params: orderIdParams })
  @McpTool({ description: "Approve a pending order and capture its reserved money and stock", confirm: { level: "danger", message: "Approve this pending order?" } })
  @ResMsg("orders.success.approved")
  approve(@Params("id") id: string, @User("id") userId: string) {
    return this.orders.approve(id, userId);
  }

  @Post("/:id/reject")
  @isOperator()
  @Validate({ params: orderIdParams, body: orderReasonDto })
  @McpTool({ description: "Reject a pending order and release its reservations", destructive: true, confirm: { level: "danger", message: "Reject this pending order?" } })
  @ResMsg("orders.success.rejected")
  reject(
    @Params("id") id: string,
    @Body() body: OrderReasonDto,
    @User("id") userId: string,
  ) {
    return this.orders.reject(id, body, userId);
  }

  @Post("/:id/preparation")
  @isOperator()
  @Validate({ params: orderIdParams })
  @McpTool({ description: "Start preparing an approved order", confirm: { level: "warning", message: "Start order preparation?" } })
  @ResMsg("orders.success.preparationStarted")
  startPreparation(@Params("id") id: string, @User("id") userId: string) {
    return this.orders.startPreparation(id, userId);
  }

  @Post("/:id/deliver")
  @isOperator()
  @Validate({ params: orderIdParams })
  @McpTool({ description: "Mark an in-preparation order as delivered", confirm: { level: "danger", message: "Mark this order delivered?" } })
  @ResMsg("orders.success.delivered")
  deliver(@Params("id") id: string, @User("id") userId: string) {
    return this.orders.deliver(id, userId);
  }

  @Post("/:id/cancel")
  @isOperator()
  @Validate({ params: orderIdParams, body: orderReasonDto })
  @McpTool({ description: "Cancel an operator-managed pending, approved, or preparing order", idempotent: true, destructive: true, confirm: { level: "danger", message: "Cancel this order and reverse its effects?" } })
  @ResMsg("orders.success.cancelled")
  cancel(
    @Params("id") id: string,
    @Body() body: OrderReasonDto,
    @User("id") userId: string,
  ) {
    return this.orders.cancel(id, body, userId);
  }
}
