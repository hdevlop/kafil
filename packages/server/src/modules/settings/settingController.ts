import { Body, Controller, Get, Put, User,
  ResMsg,
} from "najm-core";
import { McpTool, ToolGroup } from "najm-mcp";
import { Validate } from "najm-validation";

import { isOperator } from "../../config/authConfig";
import {
  type UpdateFormFillSettingDto,
  type UpdateFundingSettingDto,
  updateFormFillSettingDto,
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

  @Get("/form-fill")
  @McpTool({
    description: "Read whether the browser F8 form-fill shortcut is enabled",
    readOnly: true,
  })
  @ResMsg("settings.success.retrieved")
  getFormFill() {
    return this.settings.getFormFill();
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

  @Put("/form-fill")
  @isOperator()
  @CanUpdate()
  @Validate({ body: updateFormFillSettingDto })
  @McpTool({
    description: "Enable or disable the browser F8 form-fill shortcut",
    confirm: {
      level: "warning",
      message: "Change the F8 form-fill shortcut setting?",
    },
  })
  @ResMsg("settings.success.formFillUpdated")
  updateFormFill(
    @Body() body: UpdateFormFillSettingDto,
    @User("id") actorUserId: string,
  ) {
    return this.settings.updateFormFill(body, actorUserId);
  }
}
