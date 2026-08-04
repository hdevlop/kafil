import { Body, Controller, Get, Post, ResMsg } from "najm-core";
import { authIdentityRateLimitKey } from "najm-auth";
import { RateLimit } from "najm-rate";
import { Validate } from "najm-validation";

import {
  type AccessLoginDto,
  accessLoginDto,
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
