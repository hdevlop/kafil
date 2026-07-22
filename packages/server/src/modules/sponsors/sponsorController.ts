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

import { isAdmin, isOperator, isSponsor } from "../../config/authConfig";
import {
  type CreateOwnSponsorProfileDto,
  createOwnSponsorProfileDto,
  type CreateSponsorDto,
  createSponsorDto,
  sponsorIdParams,
  type SponsorListQuery,
  sponsorListQuery,
  type SponsorStatusDto,
  sponsorStatusDto,
  type UpdateOwnSponsorProfileDto,
  updateOwnSponsorProfileDto,
  type UpdateSponsorDto,
  updateSponsorDto,
} from "./sponsorDto";
import {
  CanCreate,
  CanDelete,
  CanList,
  CanRead,
  CanUpdate,
  Policy,
  Sponsor,
} from "./sponsorGuards";
import { SponsorService } from "./sponsorService";

@ToolGroup("sponsors")
@Policy(Sponsor)
@Controller("/sponsors")
export class SponsorController {
  constructor(private readonly sponsors: SponsorService) {}

  @Get()
  @isOperator()
  @CanList()
  @Validate({ query: sponsorListQuery })
  @McpTool({
    description: "List Kafil sponsor accounts",
    readOnly: true,
  })
  @ResMsg("sponsors.success.retrieved")
  list(@Query() query: SponsorListQuery) {
    return this.sponsors.list(query);
  }

  @Get("/me/profile")
  @isSponsor()
  @CanRead("sponsors")
  @McpTool({
    description: "Read the authenticated sponsor's own profile",
    readOnly: true,
  })
  @ResMsg("sponsors.success.retrieved")
  getOwn(@User("id") userId: string) {
    return this.sponsors.getOwn(userId);
  }

  @Get("/:id")
  @isOperator()
  @CanRead()
  @Validate({ params: sponsorIdParams })
  @McpTool({
    description: "Get a Kafil sponsor account by profile ID",
    readOnly: true,
  })
  @ResMsg("sponsors.success.retrieved")
  get(@Params("id") id: string) {
    return this.sponsors.get(id);
  }

  @Post()
  @isOperator()
  @CanCreate()
  @Validate({ body: createSponsorDto })
  @McpTool({
    description: "Create a Kafil sponsor account",
    idempotent: false,
    confirm: {
      level: "warning",
      message: "Create this sponsor account?",
    },
  })
  @ResMsg("sponsors.success.created")
  create(@Body() body: CreateSponsorDto) {
    return this.sponsors.create(body);
  }

  @Post("/me/profile")
  @isSponsor()
  @CanCreate("sponsors")
  @Validate({ body: createOwnSponsorProfileDto })
  @McpTool({
    description: "Complete the authenticated sponsor's profile",
    idempotent: false,
    confirm: {
      level: "warning",
      message: "Create your sponsor profile?",
    },
  })
  @ResMsg("sponsors.success.profileCreated")
  createOwn(
    @Body() body: CreateOwnSponsorProfileDto,
    @User("id") userId: string,
  ) {
    return this.sponsors.createOwn(userId, body);
  }

  @Put("/:id")
  @isOperator()
  @CanUpdate()
  @Validate({ params: sponsorIdParams, body: updateSponsorDto })
  @McpTool({
    description: "Update a Kafil sponsor account by profile ID",
    confirm: {
      level: "warning",
      message: "Update this sponsor account?",
    },
  })
  @ResMsg("sponsors.success.updated")
  update(@Params("id") id: string, @Body() body: UpdateSponsorDto) {
    return this.sponsors.update(id, body);
  }

  @Put("/me/profile")
  @isSponsor()
  @CanUpdate("sponsors")
  @Validate({ body: updateOwnSponsorProfileDto })
  @McpTool({
    description: "Update the authenticated sponsor's allowed profile fields",
    confirm: {
      level: "warning",
      message: "Update your sponsor profile?",
    },
  })
  @ResMsg("sponsors.success.profileUpdated")
  updateOwn(
    @Body() body: UpdateOwnSponsorProfileDto,
    @User("id") userId: string,
  ) {
    return this.sponsors.updateOwn(userId, body);
  }

  @Delete("/:id")
  @isAdmin()
  @CanDelete(Sponsor)
  @Validate({ params: sponsorIdParams })
  @McpTool({
    description: "Permanently delete an unreferenced sponsor account",
    destructive: true,
    confirm: {
      level: "danger",
      message: "Permanently delete this sponsor account? This cannot be undone.",
    },
  })
  @ResMsg("sponsors.success.deleted")
  delete(@Params("id") id: string, @User("id") actorUserId: string) {
    return this.sponsors.delete(id, actorUserId);
  }

  @Post("/:id/deactivate")
  @isOperator()
  @CanUpdate()
  @Validate({ params: sponsorIdParams, body: sponsorStatusDto })
  @McpTool({
    description: "Deactivate a sponsor account without deleting history",
    destructive: true,
    confirm: {
      level: "danger",
      message: "Deactivate this sponsor account?",
    },
  })
  @ResMsg("sponsors.success.deactivated")
  deactivate(
    @Params("id") id: string,
    @Body() body: SponsorStatusDto,
    @User("id") actorUserId: string,
  ) {
    return this.sponsors.deactivate(id, body, actorUserId);
  }

  @Post("/:id/reactivate")
  @isOperator()
  @CanUpdate()
  @Validate({ params: sponsorIdParams, body: sponsorStatusDto })
  @McpTool({
    description: "Reactivate a sponsor account",
    confirm: {
      level: "warning",
      message: "Reactivate this sponsor account?",
    },
  })
  @ResMsg("sponsors.success.reactivated")
  reactivate(
    @Params("id") id: string,
    @Body() body: SponsorStatusDto,
    @User("id") actorUserId: string,
  ) {
    return this.sponsors.reactivate(id, body, actorUserId);
  }
}
