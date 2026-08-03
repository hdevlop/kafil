import { Body, Controller, Get, Params, Post, Query, ResMsg } from "najm-core";
import { authIdentityRateLimitKey } from "najm-auth";
import { RateLimit } from "najm-rate";
import { Validate } from "najm-validation";

import {
  type ApplicantEmailOtpConfirmDto,
  type ApplicantIdParams,
  type ApplicantListQuery,
  applicantEmailOtpConfirmDto,
  applicantIdParams,
  applicantListQuery,
  type CreateApplicantInput,
  createApplicantDto,
} from "./applicantDto";
import { isAdmin } from "../../config/authConfig";
import { resolveApplicantRateLimitConfig } from "./applicantRateLimitConfig";
import { ApplicantService } from "./applicantService";

const applicantRateLimits = resolveApplicantRateLimitConfig();

@Controller("/applicants")
export class ApplicantController {
  constructor(private readonly applicants: ApplicantService) {}

  @Get()
  @isAdmin()
  @Validate({ query: applicantListQuery })
  @ResMsg("applicants.success.retrieved")
  list(@Query() query: ApplicantListQuery) {
    return this.applicants.list(query);
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

  @Get("/:id")
  @isAdmin()
  @Validate({ params: applicantIdParams })
  @ResMsg("applicants.success.retrieved")
  get(@Params("id") id: ApplicantIdParams["id"]) {
    return this.applicants.get(id);
  }
}
