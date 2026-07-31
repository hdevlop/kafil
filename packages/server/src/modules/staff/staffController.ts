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

import { isAdmin, isOperator } from "../../config/authConfig";
import {
  type BulkDeleteStaffDto,
  bulkDeleteStaffDto,
  type CreateStaffDto,
  createStaffDto,
  type ProvisionOperatorAccessDto,
  provisionOperatorAccessDto,
  type StaffIdParams,
  staffIdParams,
  type StaffListQuery,
  staffListQuery,
  type StaffStatusDto,
  staffStatusDto,
  type UpdateStaffDto,
  updateStaffDto,
} from "./staffDto";
import {
  CanCreate,
  CanDelete,
  CanList,
  CanRead,
  CanUpdate,
  Policy,
  Staff,
} from "./staffGuards";
import { StaffService } from "./staffService";

@ToolGroup("staff")
@Policy(Staff)
@Controller("/staff")
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get("/options/delivery")
  @isOperator()
  @CanRead("staffDeliveryOptions")
  @McpTool({
    description: "List active Staff with the delivery function for safe assignment selectors",
    readOnly: true,
  })
  @ResMsg("staff.success.optionsRetrieved")
  listDeliveryOptions() {
    return this.staffService.listDeliveryOptions();
  }

  @Get()
  @CanList()
  @Validate({ query: staffListQuery })
  @McpTool({
    description: "List Kafil staff profiles",
    readOnly: true,
  })
  @ResMsg("staff.success.retrieved")
  list(@Query() query: StaffListQuery) {
    return this.staffService.list(query);
  }

  @Get("/:id")
  @CanRead()
  @Validate({ params: staffIdParams })
  @McpTool({
    description: "Get a Kafil staff profile by ID",
    readOnly: true,
  })
  @ResMsg("staff.success.retrieved")
  get(@Params("id") id: string) {
    return this.staffService.get(id);
  }

  @Post()
  @isAdmin()
  @CanCreate()
  @Validate({ body: createStaffDto })
  @McpTool({
    description: "Create a Kafil staff profile",
    confirm: {
      level: "warning",
      message: "Create this staff record?",
    },
  })
  @ResMsg("staff.success.created")
  create(@Body() body: CreateStaffDto, @User("id") actorUserId: string) {
    return this.staffService.create(body, actorUserId);
  }

  @Put("/:id")
  @isAdmin()
  @CanUpdate()
  @Validate({ params: staffIdParams, body: updateStaffDto })
  @McpTool({
    description: "Update a Kafil staff profile by ID",
    confirm: {
      level: "warning",
      message: "Update this staff record?",
    },
  })
  @ResMsg("staff.success.updated")
  update(
    @Params("id") id: string,
    @Body() body: UpdateStaffDto,
    @User("id") actorUserId: string,
  ) {
    return this.staffService.update(id, body, actorUserId);
  }

  @Post("/:id/deactivate")
  @isAdmin()
  @CanUpdate()
  @Validate({ params: staffIdParams, body: staffStatusDto })
  @McpTool({
    description: "Deactivate a Kafil staff profile without deleting history",
    destructive: true,
    confirm: {
      level: "danger",
      message: "Deactivate this staff record?",
    },
  })
  @ResMsg("staff.success.deactivated")
  deactivate(
    @Params("id") id: string,
    @Body() body: StaffStatusDto,
    @User("id") actorUserId: string,
  ) {
    return this.staffService.deactivate(id, body, actorUserId);
  }

  @Post("/:id/reactivate")
  @isAdmin()
  @CanUpdate()
  @Validate({ params: staffIdParams, body: staffStatusDto })
  @McpTool({
    description: "Reactivate a Kafil staff profile",
    confirm: {
      level: "warning",
      message: "Reactivate this staff record?",
    },
  })
  @ResMsg("staff.success.reactivated")
  reactivate(
    @Params("id") id: string,
    @Body() body: StaffStatusDto,
    @User("id") actorUserId: string,
  ) {
    return this.staffService.reactivate(id, body, actorUserId);
  }

  @Post("/:id/access/operator")
  @isAdmin()
  @CanUpdate()
  @Validate({ params: staffIdParams, body: provisionOperatorAccessDto })
  @McpTool({
    description: "Provision an operator Najm account for an existing Staff record",
    confirm: {
      level: "warning",
      message: "Provision an operator account for this staff record?",
    },
  })
  @ResMsg("staff.success.operatorAccessProvisioned")
  provisionOperatorAccess(
    @Params("id") id: string,
    @Body() body: ProvisionOperatorAccessDto,
    @User("id") actorUserId: string,
  ) {
    return this.staffService.provisionOperatorAccess(id, body, actorUserId);
  }

  @Delete("/:id")
  @isAdmin()
  @CanDelete()
  @Validate({ params: staffIdParams })
  @McpTool({
    description: "Permanently delete a Staff record without delivery history",
    destructive: true,
    confirm: {
      level: "danger",
      message: "Permanently delete this staff record? This cannot be undone.",
    },
  })
  @ResMsg("staff.success.deleted")
  delete(@Params("id") id: string, @User("id") actorUserId: string) {
    return this.staffService.deletePristine(id, actorUserId);
  }

  @Post("/bulk-delete")
  @isAdmin()
  @CanDelete()
  @Validate({ body: bulkDeleteStaffDto })
  @McpTool({
    description: "Permanently delete Staff records without delivery history",
    destructive: true,
    confirm: {
      level: "danger",
      message: "Permanently delete these staff records? This cannot be undone.",
    },
  })
  @ResMsg("staff.success.deleted")
  bulkDelete(
    @Body() body: BulkDeleteStaffDto,
    @User("id") actorUserId: string,
  ) {
    return this.staffService.deletePristineMany(body, actorUserId);
  }
}

export type { StaffIdParams };
