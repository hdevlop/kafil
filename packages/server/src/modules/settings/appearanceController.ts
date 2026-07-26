import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  ResMsg,
  User,
} from "najm-core";
import { McpTool, ToolGroup } from "najm-mcp";
import { Validate } from "najm-validation";

import { isAdmin } from "../../config/authConfig";
import {
  type ResetAppearanceDto,
  resetAppearanceDto,
  type UpdateAppearanceDto,
  updateAppearanceDto,
} from "./appearanceDto";
import { AppearanceService } from "./appearanceService";

@ToolGroup("appearance")
@Controller("/appearance")
export class AppearanceController {
  constructor(private readonly appearance: AppearanceService) {}

  @Get("/")
  @McpTool({
    description: "Read the active public platform appearance",
    readOnly: true,
  })
  @ResMsg("appearance.success.retrieved")
  getAppearance() {
    return this.appearance.get();
  }

  @Put("/")
  @isAdmin()
  @Validate({ body: updateAppearanceDto })
  @McpTool({
    description: "Save the validated platform theme",
    confirm: {
      level: "warning",
      message: "Save this platform theme?",
    },
  })
  @ResMsg("appearance.success.updated")
  updateAppearance(
    @Body() body: UpdateAppearanceDto,
    @User("id") actorUserId: string,
  ) {
    return this.appearance.save(body, actorUserId);
  }

  @Post("/reset")
  @isAdmin()
  @Validate({ body: resetAppearanceDto })
  @McpTool({
    description: "Reset the platform theme to the factory design",
    destructive: true,
    confirm: {
      level: "danger",
      message: "Reset the platform theme to the factory design?",
    },
  })
  @ResMsg("appearance.success.reset")
  resetAppearance(
    @Body() body: ResetAppearanceDto,
    @User("id") actorUserId: string,
  ) {
    return this.appearance.reset(body, actorUserId);
  }
}
