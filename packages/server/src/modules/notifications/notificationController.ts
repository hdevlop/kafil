import {
  Body,
  Controller,
  Delete,
  Get,
  Params,
  Patch,
  Post,
  Put,
  Query,
  Req,
  User,
  ResMsg,
} from "najm-core";
import { McpTool, ToolGroup } from "najm-mcp";
import { Validate } from "najm-validation";

import { isNotificationReader } from "../../config/authConfig";
import {
  type NotificationListQuery,
  type NotificationSettingsDto,
  notificationIdParams,
  notificationListQuery,
  notificationSettingsDto,
  type PushSubscriptionDto,
  type PushUnsubscribeDto,
  pushSubscriptionDto,
  pushUnsubscribeDto,
} from "./notificationDto";
import {
  CanList,
  CanRead,
  CanUpdate,
  Notification,
  Policy,
} from "./notificationGuards";
import { NotificationService } from "./notificationService";

@ToolGroup("notifications")
@Policy(Notification)
@Controller("/notifications")
@isNotificationReader()
export class NotificationController {
  constructor(private readonly notifications: NotificationService) {}

  @Get()
  @CanList()
  @Validate({ query: notificationListQuery })
  @McpTool({ description: "List the authenticated user's own notifications", readOnly: true })
  @ResMsg("notifications.success.retrieved")
  listMine(@User("id") userId: string, @Query() query: NotificationListQuery) {
    return this.notifications.listMine(userId, query);
  }

  @Get("/unread-count")
  @CanRead()
  @McpTool({ description: "Count the authenticated user's unread notifications", readOnly: true })
  @ResMsg("notifications.success.retrieved")
  unreadCount(@User("id") userId: string) {
    return this.notifications.unreadCount(userId);
  }

  @Get("/settings")
  @CanRead()
  @ResMsg("notifications.success.settingsRetrieved")
  settings(@User("id") userId: string) {
    return this.notifications.getSettings(userId);
  }

  @Put("/settings")
  @CanUpdate()
  @Validate({ body: notificationSettingsDto })
  @ResMsg("notifications.success.settingsUpdated")
  updateSettings(
    @User("id") userId: string,
    @Body() body: NotificationSettingsDto,
  ) {
    return this.notifications.updateSettings(userId, body);
  }

  @Get("/push-config")
  @CanRead()
  @ResMsg("notifications.success.pushConfigRetrieved")
  pushConfig() {
    return this.notifications.pushConfig();
  }

  @Post("/push-subscriptions")
  @CanUpdate()
  @Validate({ body: pushSubscriptionDto })
  @ResMsg("notifications.success.subscriptionSaved")
  subscribe(
    @User("id") userId: string,
    @Body() body: PushSubscriptionDto,
    @Req() req?: { header?: (name: string) => string | undefined },
  ) {
    const userAgent = req?.header?.("user-agent");
    return this.notifications.subscribe(userId, body, userAgent);
  }

  @Delete("/push-subscriptions")
  @CanUpdate()
  @Validate({ body: pushUnsubscribeDto })
  @ResMsg("notifications.success.subscriptionRemoved")
  unsubscribe(
    @User("id") userId: string,
    @Body() body: PushUnsubscribeDto,
  ) {
    return this.notifications.unsubscribe(userId, body);
  }

  // Phase A MCP surface is listMine, unreadCount, and confirmed markRead
  // only. Bulk mark-all stays REST-only until a later phase confirms it.
  @Patch("/read-all")
  @CanUpdate()
  @ResMsg("notifications.success.markedAllRead")
  readAll(@User("id") userId: string) {
    return this.notifications.markAllRead(userId);
  }

  @Patch("/:id/read")
  @CanUpdate()
  @Validate({ params: notificationIdParams })
  @McpTool({ description: "Mark one own notification read", confirm: { level: "warning", message: "Mark this notification read?" } })
  @ResMsg("notifications.success.markedRead")
  markRead(@User("id") userId: string, @Params("id") id: string) {
    return this.notifications.markRead(userId, id);
  }
}
