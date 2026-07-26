import { Body, Controller, Get, Put, User,
  ResMsg,
} from "najm-core";
import { McpTool, ToolGroup } from "najm-mcp";
import { Validate } from "najm-validation";

import { isOperator } from "../../config/authConfig";
import {
  type UpdateSettingsDto,
  updateSettingsDto,
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

  @Get("/")
  @isOperator()
  @CanRead()
  @McpTool({
    description: "Read the platform settings",
    readOnly: true,
  })
  @ResMsg("settings.success.retrieved")
  getSettings() {
    return this.settings.getSettings();
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

  @Put("/")
  @isOperator()
  @CanUpdate()
  @Validate({ body: updateSettingsDto })
  @McpTool({
    description: "Update the platform settings including the pending contribution expiry window",
    confirm: {
      level: "warning",
      message: "Update the platform settings?",
    },
  })
  @ResMsg("settings.success.updated")
  updateSettings(
    @Body() body: UpdateSettingsDto,
    @User("id") actorUserId: string,
  ) {
    return this.settings.update(body, actorUserId);
  }
}