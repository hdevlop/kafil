import { Body, Controller, Get, Put, User,
  ResMsg,
} from "najm-core";
import { McpTool, ToolGroup } from "najm-mcp";
import { Validate } from "najm-validation";

import { isOperator } from "../../config/authConfig";
import {
  type UpdateFundingSettingDto,
  updateFundingSettingDto,
} from "./settingDto";
import {
  CanRead,
  CanUpdate,
  PlatformSettingPolicy,
  Policy,
} from "./settingGuards";
import { SettingService } from "./settingService";

@ToolGroup("settings")
@Policy(PlatformSettingPolicy)
@Controller("/settings")
export class SettingController {
  constructor(private readonly settings: SettingService) {}

  @Get("/funding")
  @isOperator()
  @CanRead()
  @McpTool({
    description: "Read the default funding target for new family accounts",
    readOnly: true,
  })
  @ResMsg("settings.success.retrieved")
  getFunding() {
    return this.settings.getFunding();
  }

  @Put("/funding")
  @isOperator()
  @CanUpdate()
  @Validate({ body: updateFundingSettingDto })
  @McpTool({
    description: "Update the default funding target for new family accounts",
    confirm: {
      level: "warning",
      message: "Update the default target for new family accounts?",
    },
  })
  @ResMsg("settings.success.fundingUpdated")
  updateFunding(
    @Body() body: UpdateFundingSettingDto,
    @User("id") actorUserId: string,
  ) {
    return this.settings.updateFunding(body, actorUserId);
  }
}
