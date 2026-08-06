import {
  Body,
  Controller,
  Delete,
  Get,
  Params,
  Post,
  ResMsg,
  User,
} from "najm-core";
import { McpTool, ToolGroup } from "najm-mcp";
import { Validate } from "najm-validation";

import { isAdmin } from "../../config/authConfig";
import {
  type ApplyThemePresetDto,
  applyThemePresetDto,
  type CreateThemePresetDto,
  createThemePresetDto,
  themePresetIdParams,
} from "./themePresetDto";
import { ThemePresetService } from "./themePresetService";

@ToolGroup("theme-presets")
@Controller("/theme-presets")
export class ThemePresetController {
  constructor(private readonly presets: ThemePresetService) {}

  @Get("/")
  @isAdmin()
  @McpTool({
    description: "List the saved platform theme presets",
    readOnly: true,
  })
  @ResMsg("themePresets.success.retrieved")
  listPresets() {
    return this.presets.list();
  }

  @Post("/")
  @isAdmin()
  @Validate({ body: createThemePresetDto })
  @McpTool({
    description: "Save a validated design as a named theme preset",
    confirm: {
      level: "warning",
      message: "Save this theme to the library?",
    },
  })
  @ResMsg("themePresets.success.created")
  createPreset(
    @Body() body: CreateThemePresetDto,
    @User("id") actorUserId: string,
  ) {
    return this.presets.create(body, actorUserId);
  }

  @Post("/:id/apply")
  @isAdmin()
  @Validate({ params: themePresetIdParams, body: applyThemePresetDto })
  @McpTool({
    description: "Make a saved theme preset the active platform theme",
    confirm: {
      level: "warning",
      message: "Apply this theme to the whole platform?",
    },
  })
  @ResMsg("themePresets.success.applied")
  applyPreset(
    @Params("id") id: string,
    @Body() body: ApplyThemePresetDto,
    @User("id") actorUserId: string,
  ) {
    return this.presets.apply(id, body, actorUserId);
  }

  @Delete("/:id")
  @isAdmin()
  @Validate({ params: themePresetIdParams })
  @McpTool({
    description: "Delete a saved theme preset",
    destructive: true,
    confirm: {
      level: "danger",
      message: "Delete this saved theme? This cannot be undone.",
    },
  })
  @ResMsg("themePresets.success.deleted")
  deletePreset(@Params("id") id: string, @User("id") actorUserId: string) {
    return this.presets.remove(id, actorUserId);
  }
}
