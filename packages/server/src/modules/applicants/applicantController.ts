import { Body, Controller, Get, Params, Post, Query, ResMsg, User } from "najm-core";
import { authIdentityRateLimitKey } from "najm-auth";
import {
  CanList,
  CanRead,
  CanUpdate,
} from "./applicantGuards";
import { RateLimit } from "najm-rate";
import { Validate } from "najm-validation";

import {
  type ApplicantEmailOtpConfirmDto,
  type ApplicantCountQuery,
  type ApplicantIdParams,
  type ApplicantListQuery,
  applicantEmailOtpConfirmDto,
  applicantCountQuery,
  applicantIdParams,
  applicantListQuery,
  type CreateApplicantInput,
  createApplicantDto,
  type RejectApplicantInput,
  rejectApplicantDto,
} from "./applicantDto";
import { isAdmin } from "../../config/authConfig";
import { resolveApplicantRateLimitConfig } from "./applicantRateLimitConfig";
import { ApplicantService } from "./applicantService";

const applicantRateLimits = resolveApplicantRateLimitConfig();

@Controller("/applicants")
export class ApplicantController {
  constructor(private readonly applicants: ApplicantService) {}

  @Get()
  @CanList("applicants")
  @isAdmin()
  @Validate({ query: applicantListQuery })
  @ResMsg("applicants.success.retrieved")
  list(@Query() query: ApplicantListQuery) {
    return this.applicants.list(query);
  }

  @Get("/count")
  @CanList("applicants")
  @isAdmin()
  @Validate({ query: applicantCountQuery })
  @ResMsg("applicants.success.retrieved")
  async count(@Query() query: ApplicantCountQuery) {
    const status = applicantCountQuery.parse(query).status;
    return { count: await this.applicants.countByStatus(status) };
  }

  @Post()
  @RateLimit({
    ...applicantRateLimits.registration,
    key: authIdentityRateLimitKey,
  })
  @Validate({ body: createApplicantDto })
  @ResMsg("applicants.success.submitted")
  submit(@Body() body: CreateApplicantInput) {
    return this.applicants.submit(body);
  }

  @Get("/email-verification/setup")
  @ResMsg("applicants.success.setupRetrieved")
  setup() {
    return this.applicants.setupSession();
  }

  @Get("/email-verification/status")
  @ResMsg("applicants.success.statusRetrieved")
  status() {
    return this.applicants.status();
  }

  @Post("/email-verification/resend")
  @RateLimit({
    ...applicantRateLimits.verificationResend,
    key: "ip",
  })
  @ResMsg("applicants.success.verificationRequested")
  resend() {
    return this.applicants.resend();
  }

  @Post("/email-verification/confirm")
  @RateLimit({
    ...applicantRateLimits.verificationConfirm,
    key: "ip",
  })
  @Validate({ body: applicantEmailOtpConfirmDto })
  @ResMsg("applicants.success.emailVerified")
  confirm(@Body() body: ApplicantEmailOtpConfirmDto) {
    return this.applicants.confirm(body.code);
  }

  @Post("/:id/approve")
  @CanUpdate("applicants")
  @isAdmin()
  @Validate({ params: applicantIdParams })
  @ResMsg("applicants.success.approved")
  approve(
    @Params("id") id: ApplicantIdParams["id"],
    @User("id") actorUserId: string,
  ) {
    return this.applicants.approve(id, actorUserId);
  }

  @Post("/:id/reject")
  @CanUpdate("applicants")
  @isAdmin()
  @Validate({ params: applicantIdParams, body: rejectApplicantDto })
  @ResMsg("applicants.success.rejected")
  reject(
    @Params("id") id: ApplicantIdParams["id"],
    @Body() body: RejectApplicantInput,
    @User("id") actorUserId: string,
  ) {
    return this.applicants.reject(id, body, actorUserId);
  }

  @Get("/:id")
  @CanRead("applicants")
  @isAdmin()
  @Validate({ params: applicantIdParams })
  @ResMsg("applicants.success.retrieved")
  get(@Params("id") id: ApplicantIdParams["id"]) {
    return this.applicants.get(id);
  }
}
