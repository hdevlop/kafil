import { Body, Controller, Delete, Get, Params, Post, Query, User,
  ResMsg,
} from "najm-core";
import { McpTool, ToolGroup } from "najm-mcp";
import { Validate } from "najm-validation";

import { isAdmin, isOperator, isSponsor } from "../../config/authConfig";
import {
  type BulkDeleteContributionsDto,
  bulkDeleteContributionsDto,
  type ContributionListQuery,
  contributionIdParams,
  contributionListQuery,
  type ContributionPlanListQuery,
  contributionPlanIdParams,
  contributionPlanListQuery,
  type ContributionReasonDto,
  contributionReasonDto,
  type CreateContributionDto,
  createContributionDto,
  type CreateContributionPlanDto,
  createContributionPlanDto,
  type RecordContributionDto,
  recordContributionDto,
} from "./contributionDto";
import {
  CanCreate,
  CanDelete,
  CanList,
  CanRead,
  CanUpdate,
  Contribution,
  Policy,
} from "./contributionGuards";
import { ContributionService } from "./contributionService";

@ToolGroup("contributions")
@Policy(Contribution)
@Controller("/contributions")
export class ContributionController {
  constructor(private readonly contributions: ContributionService) {}

  @Get()
  @isOperator()
  @CanList(Contribution)
  @Validate({ query: contributionListQuery })
  @McpTool({ description: "List operator-managed contribution payment records", readOnly: true })
  @ResMsg("contributions.success.retrieved")
  list(@Query() query: ContributionListQuery) {
    return this.contributions.list(query);
  }

  @Get("/recording-options")
  @isOperator()
  @CanList(Contribution)
  @McpTool({
    description: "List active sponsor-family assignments available for operator-recorded contributions",
    readOnly: true,
  })
  @ResMsg("contributions.success.retrieved")
  listRecordingOptions() {
    return this.contributions.listRecordingOptions();
  }

  @Get("/plans")
  @isOperator()
  @CanList(Contribution)
  @Validate({ query: contributionPlanListQuery })
  @McpTool({ description: "List operator-visible contribution plans", readOnly: true })
  @ResMsg("contributions.success.retrieved")
  listPlans(@Query() query: ContributionPlanListQuery) {
    return this.contributions.listPlans(query);
  }

  @Get("/me")
  @isSponsor()
  @CanList("contributions")
  @Validate({ query: contributionListQuery })
  @McpTool({ description: "List the authenticated sponsor's own contributions", readOnly: true })
  @ResMsg("contributions.success.retrieved")
  listOwn(@User("id") userId: string, @Query() query: ContributionListQuery) {
    return this.contributions.listOwn(userId, query);
  }

  @Get("/me/summary")
  @isSponsor()
  @CanRead("contributions")
  @McpTool({ description: "Read privacy-safe sponsor contribution and supported-budget totals", readOnly: true })
  @ResMsg("contributions.success.retrieved")
  getOwnSummary(@User("id") userId: string) {
    return this.contributions.getOwnSummary(userId);
  }

  @Get("/me/plans")
  @isSponsor()
  @CanList("contributions")
  @Validate({ query: contributionPlanListQuery })
  @McpTool({ description: "List the authenticated sponsor's own contribution plans", readOnly: true })
  @ResMsg("contributions.success.retrieved")
  listOwnPlans(
    @User("id") userId: string,
    @Query() query: ContributionPlanListQuery,
  ) {
    return this.contributions.listOwnPlans(userId, query);
  }

  @Get("/me/plans/:id")
  @isSponsor()
  @CanRead("contributions")
  @Validate({ params: contributionPlanIdParams })
  @McpTool({ description: "Read the authenticated sponsor's contribution plan", readOnly: true })
  @ResMsg("contributions.success.retrieved")
  getOwnPlan(@Params("id") id: string, @User("id") userId: string) {
    return this.contributions.getOwnPlan(id, userId);
  }

  @Get("/me/:id")
  @isSponsor()
  @CanRead("contributions")
  @Validate({ params: contributionIdParams })
  @McpTool({ description: "Read the authenticated sponsor's contribution", readOnly: true })
  @ResMsg("contributions.success.retrieved")
  getOwn(@Params("id") id: string, @User("id") userId: string) {
    return this.contributions.getOwn(id, userId);
  }

  @Get("/:id")
  @isOperator()
  @CanRead(Contribution)
  @Validate({ params: contributionIdParams })
  @McpTool({ description: "Read an operator-managed contribution", readOnly: true })
  @ResMsg("contributions.success.retrieved")
  get(@Params("id") id: string) {
    return this.contributions.get(id);
  }

  @Post("/me/plans")
  @isSponsor()
  @CanCreate("contributions")
  @Validate({ body: createContributionPlanDto })
  @McpTool({
    description: "Create a monthly or one-time contribution plan for an active assignment",
    confirm: { level: "warning", message: "Create this contribution plan?" },
  })
  @ResMsg("contributions.success.planCreated")
  createPlan(
    @Body() body: CreateContributionPlanDto,
    @User("id") userId: string,
  ) {
    return this.contributions.createPlan(body, userId);
  }

  @Post("/me/plans/:id/pause")
  @isSponsor()
  @CanUpdate("contributions")
  @Validate({ params: contributionPlanIdParams, body: contributionReasonDto })
  @McpTool({ description: "Pause a contribution plan", confirm: { level: "warning", message: "Pause this contribution plan?" } })
  @ResMsg("contributions.success.planPaused")
  pausePlan(
    @Params("id") id: string,
    @Body() body: ContributionReasonDto,
    @User("id") userId: string,
  ) {
    return this.contributions.pausePlan(id, body, userId);
  }

  @Post("/me/plans/:id/resume")
  @isSponsor()
  @CanUpdate("contributions")
  @Validate({ params: contributionPlanIdParams, body: contributionReasonDto })
  @McpTool({ description: "Resume a paused contribution plan", confirm: { level: "warning", message: "Resume this contribution plan?" } })
  @ResMsg("contributions.success.planResumed")
  resumePlan(
    @Params("id") id: string,
    @Body() body: ContributionReasonDto,
    @User("id") userId: string,
  ) {
    return this.contributions.resumePlan(id, body, userId);
  }

  @Post("/me/plans/:id/stop")
  @isSponsor()
  @CanUpdate("contributions")
  @Validate({ params: contributionPlanIdParams, body: contributionReasonDto })
  @McpTool({ description: "Stop a contribution plan while keeping its history", destructive: true, confirm: { level: "danger", message: "Stop this contribution plan?" } })
  @ResMsg("contributions.success.planStopped")
  stopPlan(
    @Params("id") id: string,
    @Body() body: ContributionReasonDto,
    @User("id") userId: string,
  ) {
    return this.contributions.stopPlan(id, body, userId);
  }

  @Post("/me")
  @isSponsor()
  @CanCreate("contributions")
  @Validate({ body: createContributionDto })
  @McpTool({ description: "Submit a sponsor contribution for operator validation", confirm: { level: "warning", message: "Submit this contribution for validation?" } })
  @ResMsg("contributions.success.submitted")
  submit(@Body() body: CreateContributionDto, @User("id") userId: string) {
    return this.contributions.submit(body, userId);
  }

  @Post()
  @isOperator()
  @CanCreate(Contribution)
  @Validate({ body: recordContributionDto })
  @McpTool({
    description: "Record an offline sponsor payment against an active support assignment",
    confirm: { level: "warning", message: "Record this sponsor contribution?" },
  })
  @ResMsg("contributions.success.recorded")
  record(
    @Body() body: RecordContributionDto,
    @User("id") userId: string,
  ) {
    return this.contributions.record(body, userId);
  }

  @Post("/:id/validate")
  @isOperator()
  @CanUpdate(Contribution)
  @Validate({ params: contributionIdParams })
  @McpTool({ description: "Validate a pending contribution and credit the household budget once", idempotent: true, confirm: { level: "danger", message: "Validate and credit this contribution?" } })
  @ResMsg("contributions.success.validated")
  validate(@Params("id") id: string, @User("id") userId: string) {
    return this.contributions.validate(id, userId);
  }

  @Post("/:id/reject")
  @isOperator()
  @CanUpdate(Contribution)
  @Validate({ params: contributionIdParams, body: contributionReasonDto })
  @McpTool({ description: "Reject a pending contribution without changing the budget", confirm: { level: "warning", message: "Reject this contribution?" } })
  @ResMsg("contributions.success.rejected")
  reject(
    @Params("id") id: string,
    @Body() body: ContributionReasonDto,
    @User("id") userId: string,
  ) {
    return this.contributions.reject(id, body, userId);
  }

  @Post("/:id/refund")
  @isOperator()
  @CanUpdate(Contribution)
  @Validate({ params: contributionIdParams, body: contributionReasonDto })
  @McpTool({ description: "Reverse a validated contribution with a linked ledger entry", destructive: true, confirm: { level: "danger", message: "Refund this contribution?" } })
  @ResMsg("contributions.success.refunded")
  refund(
    @Params("id") id: string,
    @Body() body: ContributionReasonDto,
    @User("id") userId: string,
  ) {
    return this.contributions.refund(id, body, userId);
  }

  @Post("/bulk-delete")
  @isAdmin()
  @CanDelete(Contribution)
  @Validate({ body: bulkDeleteContributionsDto })
  @McpTool({
    description: "Permanently delete multiple incorrect contributions after their budget effects have been fully reversed",
    destructive: true,
    confirm: {
      level: "danger",
      message: "Permanently delete these contributions? This cannot be undone.",
    },
  })
  @ResMsg("contributions.success.deleted")
  bulkDelete(
    @Body() body: BulkDeleteContributionsDto,
    @User("id") userId: string,
  ) {
    return this.contributions.deleteMany(body.ids, userId);
  }

  @Delete("/:id")
  @isAdmin()
  @CanDelete(Contribution)
  @Validate({ params: contributionIdParams })
  @McpTool({
    description: "Permanently delete an incorrect contribution after its budget effect has been fully reversed",
    destructive: true,
    confirm: {
      level: "danger",
      message: "Permanently delete this contribution? This cannot be undone.",
    },
  })
  @ResMsg("contributions.success.deleted")
  delete(@Params("id") id: string, @User("id") userId: string) {
    return this.contributions.delete(id, userId);
  }
}
