import { Body, Controller, Get, Params, Post, Put, Query, User,
  ResMsg,
} from "najm-core";
import { McpTool, ToolGroup } from "najm-mcp";
import { Validate } from "najm-validation";

import { isOperator, isSponsor } from "../../config/authConfig";
import {
  type CreateSupportAssignmentDto,
  createSupportAssignmentDto,
  type EndSupportAssignmentDto,
  endSupportAssignmentDto,
  type UpdateSupportAssignmentNotesDto,
  updateSupportAssignmentNotesDto,
  type OwnSupportAssignmentListQuery,
  ownSupportAssignmentListQuery,
  supportAssignmentIdParams,
  type SupportAssignmentListQuery,
  supportAssignmentListQuery,
  type SponsorFamilyCatalogQuery,
  sponsorFamilyCatalogQuery,
  type SelectSponsorFamilyDto,
  selectSponsorFamilyDto,
} from "./supportAssignmentDto";
import {
  CanCreate,
  CanList,
  CanRead,
  CanUpdate,
  Policy,
  SupportAssignment,
} from "./supportAssignmentGuards";
import { SupportAssignmentService } from "./supportAssignmentService";

@ToolGroup("support-assignments")
@Policy(SupportAssignment)
@Controller("/support-assignments")
export class SupportAssignmentController {
  constructor(private readonly assignments: SupportAssignmentService) {}

  @Get()
  @isOperator()
  @CanList(SupportAssignment)
  @Validate({ query: supportAssignmentListQuery })
  @McpTool({
    description: "List operator-managed sponsor support assignments",
    readOnly: true,
  })
  @ResMsg("supportAssignments.success.retrieved")
  list(@Query() query: SupportAssignmentListQuery) {
    return this.assignments.list(query);
  }

  @Get("/me")
  @isSponsor()
  @CanList("supportAssignments")
  @Validate({ query: ownSupportAssignmentListQuery })
  @McpTool({
    description: "List the authenticated sponsor's own support assignments",
    readOnly: true,
  })
  @ResMsg("supportAssignments.success.retrieved")
  listOwn(
    @User("id") userId: string,
    @Query() query: OwnSupportAssignmentListQuery,
  ) {
    return this.assignments.listOwn(userId, query);
  }

  @Get("/catalog")
  @isSponsor()
  @CanList("supportAssignments")
  @Validate({ query: sponsorFamilyCatalogQuery })
  @McpTool({
    description: "List active families available for sponsor support",
    readOnly: true,
  })
  @ResMsg("families.success.retrieved")
  listSponsorFamilyCatalog(@Query() query: SponsorFamilyCatalogQuery) {
    return this.assignments.listSponsorFamilyCatalog(query);
  }

  @Get("/me/:id/family")
  @isSponsor()
  @CanRead("supportAssignments")
  @Validate({ params: supportAssignmentIdParams })
  @McpTool({
    description:
      "Read the authenticated sponsor's privacy-safe supported family summary",
    readOnly: true,
  })
  @ResMsg("supportAssignments.success.retrieved")
  getSupportedFamilySummary(
    @Params("id") id: string,
    @User("id") userId: string,
  ) {
    return this.assignments.getSupportedFamilySummary(id, userId);
  }

  @Get("/me/:id/child")
  @isSponsor()
  @CanRead("supportAssignments")
  @Validate({ params: supportAssignmentIdParams })
  @McpTool({
    description:
      "Read the authenticated sponsor's privacy-safe supported child summary",
    readOnly: true,
  })
  @ResMsg("supportAssignments.success.retrieved")
  getSupportedChildSummary(
    @Params("id") id: string,
    @User("id") userId: string,
  ) {
    return this.assignments.getSupportedChildSummary(id, userId);
  }

  @Get("/me/:id")
  @isSponsor()
  @CanRead("supportAssignments")
  @Validate({ params: supportAssignmentIdParams })
  @McpTool({
    description: "Read one support assignment owned by the authenticated sponsor",
    readOnly: true,
  })
  @ResMsg("supportAssignments.success.retrieved")
  getOwn(@Params("id") id: string, @User("id") userId: string) {
    return this.assignments.getOwn(id, userId);
  }

  @Post("/me")
  @isSponsor()
  @CanCreate("supportAssignments")
  @Validate({ body: selectSponsorFamilyDto })
  @McpTool({
    description: "Select an active family for the authenticated sponsor to support",
    idempotent: true,
    confirm: {
      level: "warning",
      message: "Start supporting this family?",
    },
  })
  @ResMsg("supportAssignments.success.created")
  selectFamilyForSponsor(
    @Body() body: SelectSponsorFamilyDto,
    @User("id") userId: string,
  ) {
    return this.assignments.selectFamilyForSponsor(body, userId);
  }

  @Get("/:id")
  @isOperator()
  @CanRead(SupportAssignment)
  @Validate({ params: supportAssignmentIdParams })
  @McpTool({
    description: "Read an operator-managed support assignment",
    readOnly: true,
  })
  @ResMsg("supportAssignments.success.retrieved")
  get(@Params("id") id: string) {
    return this.assignments.get(id);
  }

  @Post()
  @isOperator()
  @CanCreate(SupportAssignment)
  @Validate({ body: createSupportAssignmentDto })
  @McpTool({
    description: "Create an active sponsor-to-family assignment",
    idempotent: false,
    confirm: {
      level: "warning",
      message: "Create this sponsor support assignment?",
    },
  })
  @ResMsg("supportAssignments.success.created")
  create(
    @Body() body: CreateSupportAssignmentDto,
    @User("id") actorUserId: string,
  ) {
    return this.assignments.create(body, actorUserId);
  }

  @Put("/:id/notes")
  @isOperator()
  @CanUpdate(SupportAssignment)
  @Validate({
    params: supportAssignmentIdParams,
    body: updateSupportAssignmentNotesDto,
  })
  @McpTool({
    description: "Update operator-only notes on a support assignment",
    idempotent: true,
    confirm: {
      level: "warning",
      message: "Update these operator notes?",
    },
  })
  @ResMsg("supportAssignments.success.updated")
  updateNotes(
    @Params("id") id: string,
    @Body() body: UpdateSupportAssignmentNotesDto,
    @User("id") actorUserId: string,
  ) {
    return this.assignments.updateNotes(id, body, actorUserId);
  }

  @Post("/:id/end")
  @isOperator()
  @CanUpdate(SupportAssignment)
  @Validate({ params: supportAssignmentIdParams, body: endSupportAssignmentDto })
  @McpTool({
    description: "End a support assignment while retaining its history",
    destructive: true,
    confirm: {
      level: "danger",
      message: "End this support assignment?",
    },
  })
  @ResMsg("supportAssignments.success.ended")
  end(
    @Params("id") id: string,
    @Body() body: EndSupportAssignmentDto,
    @User("id") actorUserId: string,
  ) {
    return this.assignments.end(id, body, actorUserId);
  }
}
