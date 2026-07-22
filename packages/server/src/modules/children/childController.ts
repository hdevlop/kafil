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
  type ChildListQuery,
  childIdParams,
  childListQuery,
  type ChildStatusDto,
  childStatusDto,
  type CreateChildDto,
  createChildDto,
  type UpdateChildDto,
  updateChildDto,
} from "./childDto";
import {
  CanCreate,
  CanDelete,
  CanList,
  CanRead,
  CanUpdate,
  Child,
} from "./childGuards";
import { ChildService } from "./childService";

@ToolGroup("children")
@Controller("/children")
export class ChildController {
  constructor(private readonly children: ChildService) {}

  @Get()
  @isOperator()
  @CanList(Child)
  @Validate({ query: childListQuery })
  @McpTool({
    description: "List children for Kafil operations",
    readOnly: true,
  })
  @ResMsg("children.success.retrieved")
  list(@Query() query: ChildListQuery) {
    return this.children.list(query);
  }

  @Get("/me")
  @isFamily()
  @CanList("children")
  @McpTool({
    description: "List the authenticated family's own children",
    readOnly: true,
  })
  @ResMsg("children.success.retrieved")
  listOwn(@User("id") userId: string) {
    return this.children.listOwn(userId);
  }

  @Get("/me/:id")
  @isFamily()
  @CanRead("children")
  @Validate({ params: childIdParams })
  @McpTool({
    description: "Read one child belonging to the authenticated family",
    readOnly: true,
  })
  @ResMsg("children.success.retrieved")
  getOwn(@Params("id") id: string, @User("id") userId: string) {
    return this.children.getOwn(id, userId);
  }

  @Get("/:id")
  @isOperator()
  @CanRead(Child)
  @Validate({ params: childIdParams })
  @McpTool({
    description: "Get a child by ID",
    readOnly: true,
  })
  @ResMsg("children.success.retrieved")
  get(@Params("id") id: string) {
    return this.children.get(id);
  }

  @Post()
  @isOperator()
  @CanCreate(Child)
  @Validate({ body: createChildDto })
  @McpTool({
    description: "Create a child record for a family profile",
    idempotent: false,
    confirm: {
      level: "warning",
      message: "Create this child record?",
    },
  })
  @ResMsg("children.success.created")
  create(@Body() body: CreateChildDto) {
    return this.children.create(body);
  }

  @Put("/:id")
  @isOperator()
  @CanUpdate(Child)
  @Validate({ params: childIdParams, body: updateChildDto })
  @McpTool({
    description: "Update an operator-managed child record",
    confirm: {
      level: "warning",
      message: "Update this child record?",
    },
  })
  @ResMsg("children.success.updated")
  update(@Params("id") id: string, @Body() body: UpdateChildDto) {
    return this.children.update(id, body);
  }

  @Delete("/:id")
  @isAdmin()
  @CanDelete(Child)
  @Validate({ params: childIdParams })
  @McpTool({
    description: "Permanently delete a child record",
    destructive: true,
    confirm: {
      level: "danger",
      message: "Permanently delete this child record? This cannot be undone.",
    },
  })
  @ResMsg("children.success.deleted")
  delete(@Params("id") id: string, @User("id") actorUserId: string) {
    return this.children.delete(id, actorUserId);
  }

  @Post("/:id/deactivate")
  @isOperator()
  @CanUpdate(Child)
  @Validate({ params: childIdParams, body: childStatusDto })
  @McpTool({
    description: "Deactivate a child record while preserving its history",
    destructive: true,
    confirm: {
      level: "danger",
      message: "Deactivate this child record?",
    },
  })
  @ResMsg("children.success.deactivated")
  deactivate(
    @Params("id") id: string,
    @Body() body: ChildStatusDto,
    @User("id") actorUserId: string,
  ) {
    return this.children.deactivate(id, body, actorUserId);
  }

  @Post("/:id/reactivate")
  @isOperator()
  @CanUpdate(Child)
  @Validate({ params: childIdParams, body: childStatusDto })
  @McpTool({
    description: "Reactivate a child record",
    confirm: {
      level: "warning",
      message: "Reactivate this child record?",
    },
  })
  @ResMsg("children.success.reactivated")
  reactivate(
    @Params("id") id: string,
    @Body() body: ChildStatusDto,
    @User("id") actorUserId: string,
  ) {
    return this.children.reactivate(id, body, actorUserId);
  }
}
