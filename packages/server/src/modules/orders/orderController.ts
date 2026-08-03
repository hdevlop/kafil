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

import { isAdmin, isFamily, isOperator, isOrderReader, isSponsor } from "../../config/authConfig";
import {
  type AssignDeliveryDto,
  assignDeliveryDto,
  type AssistedOrderDto,
  assistedOrderDto,
  type CartItemDto,
  cartItemDto,
  cartProductIdParams,
  type ConfirmDeliveryDto,
  confirmDeliveryDto,
  type FamilyCancelOrderDto,
  familyCancelOrderDto,
  type FailDeliveryDto,
  failDeliveryDto,
  type OperatorCancelOrderDto,
  operatorCancelOrderDto,
  orderIdParams,
  type OrderListQuery,
  orderListQuery,
  type OrderReasonDto,
  orderReasonDto,
  type OwnOrderListQuery,
  ownOrderListQuery,
  type RecordPurchaseDto,
  recordPurchaseDto,
  type ReplacePurchaseDto,
  replacePurchaseDto,
  type ReassignDeliveryDto,
  reassignDeliveryDto,
  type SetCartItemQuantityDto,
  setCartItemQuantityDto,
  type SubmitOrderDto,
  submitOrderDto,
  type StartDeliveryDto,
  startDeliveryDto,
} from "./orderDto";
import { OrderService } from "./orderService";
import { CanDelete } from "./orderGuards";

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

  @Post("/assisted")
  @isOperator()
  @Validate({ body: assistedOrderDto })
  @McpTool({
    description:
      "Create a pending, audited order for a family, reserve its budget, and optionally plan purchasing and delivery staff",
    idempotent: true,
    confirm: {
      level: "danger",
      message: "Create this assisted family order and reserve its budget?",
    },
  })
  @ResMsg("orders.success.assistedSubmitted")
  submitAssisted(
    @Body() body: AssistedOrderDto,
    @User("id") actorUserId: string,
  ) {
    return this.orders.submitAssisted(body, actorUserId);
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
  @isOrderReader()
  @Validate({ query: orderListQuery })
  @McpTool({ description: "List role-scoped orders for the authenticated principal", readOnly: true })
  @ResMsg("orders.success.retrieved")
  list(
    @Query() query: OrderListQuery,
    @User("id") userId: string,
    @User("role") role: string,
  ) {
    return this.orders.listForPrincipal(userId, role, query);
  }

  @Get("/:id")
  @isOrderReader()
  @Validate({ params: orderIdParams })
  @McpTool({ description: "Read a role-scoped order for the authenticated principal", readOnly: true })
  @ResMsg("orders.success.retrieved")
  get(
    @Params("id") id: string,
    @User("id") userId: string,
    @User("role") role: string,
  ) {
    return this.orders.getForPrincipal(id, userId, role);
  }

  @Delete("/:id")
  @CanDelete("orders")
  @isAdmin()
  @Validate({ params: orderIdParams })
  @McpTool({
    description:
      "Permanently delete a mistaken pre-purchase order and rebuild its family budget snapshots",
    destructive: true,
    confirm: {
      level: "danger",
      message:
        "Permanently delete this pre-purchase order? This cannot be undone.",
    },
  })
  @ResMsg("orders.success.deleted")
  delete(@Params("id") id: string, @User("id") userId: string) {
    return this.orders.delete(id, userId);
  }

  @Post("/:id/approve")
  @isOperator()
  @Validate({ params: orderIdParams })
  @McpTool({ description: "Approve a pending order while keeping its budget reserved", confirm: { level: "danger", message: "Approve this pending order for purchasing?" } })
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

  @Post("/:id/purchase")
  @isOperator()
  @Validate({ params: orderIdParams, body: recordPurchaseDto })
  @McpTool({
    description: "Record an approved order purchase and settle its actual cost",
    idempotent: true,
    confirm: {
      level: "danger",
      message: "Record this purchase and settle the family budget?",
    },
  })
  @ResMsg("orders.success.purchaseRecorded")
  recordPurchase(
    @Params("id") id: string,
    @Body() body: RecordPurchaseDto,
    @User("id") userId: string,
  ) {
    return this.orders.recordPurchase(id, body, userId);
  }

  @Post("/:id/purchase/replace")
  @isOperator()
  @Validate({ params: orderIdParams, body: replacePurchaseDto })
  @McpTool({
    description: "Replace an order purchase while retaining its audit history",
    idempotent: true,
    destructive: true,
    confirm: {
      level: "danger",
      message: "Reverse and replace this purchase record?",
    },
  })
  @ResMsg("orders.success.purchaseReplaced")
  replacePurchase(
    @Params("id") id: string,
    @Body() body: ReplacePurchaseDto,
    @User("id") userId: string,
  ) {
    return this.orders.replacePurchase(id, body, userId);
  }

  @Post("/:id/delivery/assign")
  @isOperator()
  @Validate({ params: orderIdParams, body: assignDeliveryDto })
  @McpTool({
    description: "Assign active Delivery staff to a pending, approved, or purchased order",
    idempotent: true,
    confirm: { level: "warning", message: "Assign this delivery staff member?" },
  })
  @ResMsg("orders.success.deliveryAssigned")
  assignDelivery(
    @Params("id") id: string,
    @Body() body: AssignDeliveryDto,
    @User("id") userId: string,
  ) {
    return this.orders.assignDelivery(id, body, userId);
  }

  @Post("/:id/delivery/reassign")
  @isOperator()
  @Validate({ params: orderIdParams, body: reassignDeliveryDto })
  @McpTool({
    description: "Replace an unstarted delivery assignment with immutable history",
    idempotent: true,
    confirm: { level: "warning", message: "Change the assigned delivery staff member?" },
  })
  @ResMsg("orders.success.deliveryReassigned")
  reassignDelivery(
    @Params("id") id: string,
    @Body() body: ReassignDeliveryDto,
    @User("id") userId: string,
  ) {
    return this.orders.reassignDelivery(id, body, userId);
  }

  @Post("/:id/delivery/start")
  @isOperator()
  @Validate({ params: orderIdParams, body: startDeliveryDto })
  @McpTool({
    description: "Start delivery for a purchased order",
    confirm: { level: "warning", message: "Start delivery for this order?" },
  })
  @ResMsg("orders.success.deliveryStarted")
  startDelivery(
    @Params("id") id: string,
    @Body() body: StartDeliveryDto,
    @User("id") userId: string,
  ) {
    return this.orders.startDelivery(id, body, userId);
  }

  @Post("/:id/delivery/fail")
  @isOperator()
  @Validate({ params: orderIdParams, body: failDeliveryDto })
  @McpTool({
    description: "Close an in-progress delivery attempt as failed",
    idempotent: true,
    destructive: true,
    confirm: { level: "warning", message: "Record this delivery attempt as failed?" },
  })
  @ResMsg("orders.success.deliveryFailed")
  failDelivery(
    @Params("id") id: string,
    @Body() body: FailDeliveryDto,
    @User("id") userId: string,
  ) {
    return this.orders.failDelivery(id, body, userId);
  }

  @Post("/:id/delivery/confirm")
  @isOperator()
  @Validate({ params: orderIdParams, body: confirmDeliveryDto })
  @McpTool({
    description: "Confirm terminal delivery for an out-for-delivery order",
    idempotent: true,
    confirm: {
      level: "danger",
      message: "Confirm this order was delivered?",
    },
  })
  @ResMsg("orders.success.delivered")
  confirmDelivery(
    @Params("id") id: string,
    @Body() body: ConfirmDeliveryDto,
    @User("id") userId: string,
  ) {
    return this.orders.confirmDelivery(id, body, userId);
  }

  @Post("/:id/deliver")
  @isOperator()
  @Validate({ params: orderIdParams })
  @McpTool({ description: "Mark an in-preparation order as delivered", confirm: { level: "danger", message: "Mark this order delivered?" } })
  @ResMsg("orders.success.delivered")
  deliver(@Params("id") id: string, @User("id") userId: string) {
    return this.orders.deliverLegacy(id, userId);
  }

  @Post("/:id/cancel")
  @isOperator()
  @Validate({ params: orderIdParams, body: operatorCancelOrderDto })
  @McpTool({ description: "Cancel an operator-managed pending, approved, or preparing order", idempotent: true, destructive: true, confirm: { level: "danger", message: "Cancel this order and reverse its effects?" } })
  @ResMsg("orders.success.cancelled")
  cancel(
    @Params("id") id: string,
    @Body() body: OperatorCancelOrderDto,
    @User("id") userId: string,
  ) {
    return this.orders.cancel(id, body, userId);
  }
}
