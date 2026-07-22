import { Body, Controller, Get, Post, ResMsg, User } from "najm-core";
import { RateLimit } from "najm-rate";
import { Validate } from "najm-validation";

import {
  type AccessLoginDto,
  accessLoginDto,
  type ConfirmEmailVerificationDto,
  confirmEmailVerificationDto,
  type RequestEmailVerificationDto,
  requestEmailVerificationDto,
  type SponsorAccessRegistrationDto,
  sponsorAccessRegistrationDto,
  type FamilyFirstPasswordDto,
  familyFirstPasswordDto,
} from "./accessDto";
import { AccessService } from "./accessService";
import { FamilyPasswordService } from "./familyPasswordService";
import { isFamily } from "../../config/authConfig";

@Controller("/access")
export class AccessController {
  constructor(
    private readonly access: AccessService,
    private readonly familyPasswords: FamilyPasswordService,
  ) {}

  @Post("/login")
  @RateLimit({ limit: 5, window: "15m", key: "ip" })
  @Validate({ body: accessLoginDto })
  @ResMsg("access.success.login")
  login(@Body() body: AccessLoginDto) {
    return this.access.login(body);
  }

  @Post("/register/sponsor")
  @RateLimit({ limit: 5, window: "15m", key: "ip" })
  @Validate({ body: sponsorAccessRegistrationDto })
  @ResMsg("access.success.registered")
  registerSponsor(@Body() body: SponsorAccessRegistrationDto) {
    return this.access.registerSponsor(body);
  }

  @Post("/email-verification/request")
  @RateLimit({ limit: 3, window: "15m", key: "ip" })
  @Validate({ body: requestEmailVerificationDto })
  @ResMsg("access.success.verificationRequested")
  requestVerification(@Body() body: RequestEmailVerificationDto) {
    return this.access.requestVerification(body.email);
  }

  @Post("/email-verification/confirm")
  @RateLimit({ limit: 5, window: "15m", key: "ip" })
  @Validate({ body: confirmEmailVerificationDto })
  @ResMsg("access.success.emailVerified")
  confirmVerification(@Body() body: ConfirmEmailVerificationDto) {
    return this.access.confirmVerification(body.token);
  }

  @Get("/family-password/requirement")
  @isFamily()
  @ResMsg("access.success.passwordRequirementRetrieved")
  passwordRequirement(@User("id") userId: string) {
    return this.familyPasswords.requirement(userId);
  }

  @Post("/family-password/change")
  @isFamily()
  @RateLimit({ limit: 5, window: "15m", key: "ip" })
  @Validate({ body: familyFirstPasswordDto })
  @ResMsg("access.success.passwordChanged")
  changeFamilyPassword(
    @Body() body: FamilyFirstPasswordDto,
    @User("id") userId: string,
  ) {
    return this.familyPasswords.change(userId, body);
  }
}
