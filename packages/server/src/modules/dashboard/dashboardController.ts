import { Controller, Get, Query, User,
  ResMsg,
} from "najm-core";
import { McpTool, ToolGroup } from "najm-mcp";
import { Validate } from "najm-validation";

import { isFamily, isOperator, isSponsor } from "../../config/authConfig";
import { DashboardService } from "./dashboardService";
import {
  type DeliveryDashboardQuery,
  deliveryDashboardQuery,
} from "./dashboardDto";

@ToolGroup("dashboard")
@Controller("/dashboard")
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get("/operator")
  @isOperator()
  @McpTool({ description: "Read operator dashboard KPIs and trends", readOnly: true })
  @ResMsg("dashboards.success.retrieved")
  getOperator() {
    return this.dashboard.getOperator();
  }

  @Get("/delivery/context")
  @isOperator()
  @McpTool({ description: "Check whether the authenticated Staff profile can use the delivery dashboard", readOnly: true })
  @ResMsg("dashboards.success.retrieved")
  getDeliveryContext(@User("id") userId: string) {
    return this.dashboard.getDeliveryContext(userId);
  }

  @Get("/delivery")
  @isOperator()
  @Validate({ query: deliveryDashboardQuery })
  @McpTool({ description: "Read the authenticated Staff member's scheduled deliveries", readOnly: true })
  @ResMsg("dashboards.success.retrieved")
  getDelivery(
    @User("id") userId: string,
    @Query() query: DeliveryDashboardQuery,
  ) {
    return this.dashboard.getDelivery(userId, query.date);
  }

  @Get("/family")
  @isFamily()
  @McpTool({ description: "Read the authenticated family's private dashboard summary", readOnly: true })
  @ResMsg("dashboards.success.retrieved")
  getFamily(@User("id") userId: string) {
    return this.dashboard.getFamily(userId);
  }

  @Get("/sponsor")
  @isSponsor()
  @McpTool({ description: "Read the authenticated sponsor's privacy-safe dashboard summary", readOnly: true })
  @ResMsg("dashboards.success.retrieved")
  getSponsor(@User("id") userId: string) {
    return this.dashboard.getSponsor(userId);
  }
}
