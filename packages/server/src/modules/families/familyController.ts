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

import { isAdmin, isFamily, isOperator } from "../../config/authConfig";
import {
  type AccountStatusDto,
  accountStatusDto,
  type CreateFamilyDto,
  createFamilyDto,
  familyIdParams,
  type FamilyListQuery,
  familyListQuery,
  type UpdateFamilyDto,
  updateFamilyDto,
} from "./familyDto";
import {
  CanCreate,
  CanDelete,
  CanList,
  CanRead,
  CanUpdate,
  Family,
} from "./familyGuards";
import { FamilyService } from "./familyService";

@ToolGroup("families")
@Controller("/families")
export class FamilyController {
  constructor(private readonly families: FamilyService) {}

  @Get()
  @isOperator()
  @CanList(Family)
  @Validate({ query: familyListQuery })
  @McpTool({
    description: "List family accounts for Kafil operations",
    readOnly: true,
  })
  @ResMsg("families.success.retrieved")
  list(@Query() query: FamilyListQuery) {
    return this.families.list(query);
  }

  @Get("/me")
  @isFamily()
  @CanRead("families")
  @McpTool({
    description: "Read the authenticated family's own profile and household summary",
    readOnly: true,
  })
  @ResMsg("families.success.retrieved")
  getOwn(@User("id") userId: string) {
    return this.families.getOwn(userId);
  }

  @Get("/:id")
  @isOperator()
  @CanRead(Family)
  @Validate({ params: familyIdParams })
  @McpTool({
    description: "Get a family account by profile ID",
    readOnly: true,
  })
  @ResMsg("families.success.retrieved")
  get(@Params("id") id: string) {
    return this.families.get(id);
  }

  @Post()
  @isOperator()
  @CanCreate(Family)
  @Validate({ body: createFamilyDto })
  @McpTool({
    description: "Provision a family account and optional initial children",
    idempotent: false,
    confirm: {
      level: "warning",
      message: "Create this family account and generate its initial login?",
    },
  })
  @ResMsg("families.success.created")
  create(
    @Body() body: CreateFamilyDto,
    @User("id") actorUserId: string,
  ) {
    return this.families.create(body, actorUserId);
  }

  @Put("/:id")
  @isOperator()
  @CanUpdate(Family)
  @Validate({ params: familyIdParams, body: updateFamilyDto })
  @McpTool({
    description: "Update operator-managed family profile fields",
    confirm: {
      level: "warning",
      message: "Update this family profile?",
    },
  })
  @ResMsg("families.success.updated")
  update(
    @Params("id") id: string,
    @Body() body: UpdateFamilyDto,
    @User("id") actorUserId: string,
  ) {
    return this.families.update(id, body, actorUserId);
  }

  @Delete("/:id")
  @isAdmin()
  @CanDelete(Family)
  @Validate({ params: familyIdParams })
  @McpTool({
    description: "Permanently delete a family account",
    destructive: true,
    confirm: {
      level: "danger",
      message: "Permanently delete this family account? This cannot be undone.",
    },
  })
  @ResMsg("families.success.deleted")
  delete(@Params("id") id: string, @User("id") actorUserId: string) {
    return this.families.delete(id, actorUserId);
  }

  @Post("/:id/deactivate")
  @isOperator()
  @CanUpdate(Family)
  @Validate({ params: familyIdParams, body: accountStatusDto })
  @McpTool({
    description: "Deactivate a family account without deleting history",
    destructive: true,
    confirm: {
      level: "danger",
      message: "Deactivate this family account?",
    },
  })
  @ResMsg("families.success.deactivated")
  deactivate(
    @Params("id") id: string,
    @Body() body: AccountStatusDto,
    @User("id") actorUserId: string,
  ) {
    return this.families.deactivate(id, body, actorUserId);
  }

  @Post("/:id/reactivate")
  @isOperator()
  @CanUpdate(Family)
  @Validate({ params: familyIdParams, body: accountStatusDto })
  @McpTool({
    description: "Reactivate a family account",
    confirm: {
      level: "warning",
      message: "Reactivate this family account?",
    },
  })
  @ResMsg("families.success.reactivated")
  reactivate(
    @Params("id") id: string,
    @Body() body: AccountStatusDto,
    @User("id") actorUserId: string,
  ) {
    return this.families.reactivate(id, body, actorUserId);
  }
}
