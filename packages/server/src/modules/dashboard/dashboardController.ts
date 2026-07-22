import { Controller, Get, User,
  ResMsg,
} from "najm-core";
import { McpTool, ToolGroup } from "najm-mcp";

import { isFamily, isOperator, isSponsor } from "../../config/authConfig";
import { DashboardService } from "./dashboardService";

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
