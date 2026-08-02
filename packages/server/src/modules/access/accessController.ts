import { Body, Controller, Get, Post, ResMsg } from "najm-core";
import { authIdentityRateLimitKey } from "najm-auth";
import { RateLimit } from "najm-rate";
import { Validate } from "najm-validation";

import {
  type AccessLoginDto,
  accessLoginDto,
  type ConfirmEmailVerificationDto,
  confirmEmailVerificationDto,
  type SponsorAccessRegistrationDto,
  sponsorAccessRegistrationDto,
  type FamilyFirstPasswordDto,
  familyFirstPasswordDto,
} from "./accessDto";
import { AccessService } from "./accessService";
import { FamilyPasswordService } from "./familyPasswordService";
import { resolveAccessRateLimitConfig } from "./accessRateLimitConfig";

const accessRateLimits = resolveAccessRateLimitConfig();

@Controller("/access")
export class AccessController {
  constructor(
    private readonly access: AccessService,
    private readonly familyPasswords: FamilyPasswordService,
  ) {}

  @Post("/login")
  @RateLimit({
    ...accessRateLimits.login,
    key: authIdentityRateLimitKey,
    message: "Too many login attempts. Please try again later.",
  })
  @Validate({ body: accessLoginDto })
  @ResMsg("access.success.login")
  login(@Body() body: AccessLoginDto) {
    return this.access.login(body);
  }

  @Post("/register/sponsor")
  @RateLimit({
    ...accessRateLimits.sponsorRegistration,
    key: authIdentityRateLimitKey,
  })
  @Validate({ body: sponsorAccessRegistrationDto })
  @ResMsg("access.success.registered")
  registerSponsor(@Body() body: SponsorAccessRegistrationDto) {
    return this.access.registerSponsor(body);
  }

  @Get("/email-verification/setup")
  @ResMsg("access.success.verificationSetupRetrieved")
  verificationSetup() {
    return this.access.verificationSetup();
  }

  @Post("/email-verification/resend")
  @RateLimit({ ...accessRateLimits.verificationResend, key: "ip" })
  @ResMsg("access.success.verificationRequested")
  resendVerification() {
    return this.access.resendVerification();
  }

  @Post("/email-verification/confirm")
  @RateLimit({ ...accessRateLimits.verificationConfirm, key: "ip" })
  @Validate({ body: confirmEmailVerificationDto })
  @ResMsg("access.success.emailVerified")
  confirmVerification(@Body() body: ConfirmEmailVerificationDto) {
    return this.access.confirmVerification(body.code);
  }

  @Post("/email-verification/cancel")
  @ResMsg("access.success.verificationCancelled")
  cancelVerification() {
    return this.access.cancelVerification();
  }

  @Get("/family-password/setup")
  @ResMsg("access.success.passwordRequirementRetrieved")
  passwordSetup() {
    return this.familyPasswords.requirement();
  }

  @Post("/family-password/change")
  @RateLimit({ ...accessRateLimits.familyPasswordChange, key: "ip" })
  @Validate({ body: familyFirstPasswordDto })
  @ResMsg("access.success.passwordChanged")
  changeFamilyPassword(@Body() body: FamilyFirstPasswordDto) {
    return this.familyPasswords.change(body);
  }

  @Post("/family-password/cancel")
  @ResMsg("access.success.passwordSetupCancelled")
  cancelFamilyPasswordSetup() {
    return this.familyPasswords.cancel();
  }
}
