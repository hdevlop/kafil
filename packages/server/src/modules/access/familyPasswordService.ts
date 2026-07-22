import {
  CookieManager,
  EncryptionService,
  TokenService,
  UserRepository,
  UserService,
  UserValidator,
} from "najm-auth";
import { HttpError, Service } from "najm-core";
import { Transaction } from "najm-database";

import type { FamilyFirstPasswordDto } from "./accessDto";
import { familyFirstPasswordDto } from "./accessDto";
import { AccessRepository } from "./accessRepository";

@Service()
export class FamilyPasswordService {
  constructor(
    private readonly users: UserService,
    private readonly userRecords: UserRepository,
    private readonly validator: UserValidator,
    private readonly encryption: EncryptionService,
    private readonly tokens: TokenService,
    private readonly cookies: CookieManager,
    private readonly access: AccessRepository,
  ) {}

  async requirement(userId: string) {
    return {
      mustChangePassword:
        await this.access.requiresFamilyPasswordChange(userId),
    };
  }

  async change(userId: string, data: FamilyFirstPasswordDto) {
    const input = familyFirstPasswordDto.parse(data);
    await this.persistPassword(userId, input);

    await this.tokens.invalidateUserAccessTokens(userId);
    await this.tokens.revokeAllForUser(userId);
    this.cookies.clearRefreshToken();
    this.cookies.clearSessionCookie();

    return { changed: true, signInAgain: true };
  }

  @Transaction({ retries: 2 })
  private async persistPassword(
    userId: string,
    input: FamilyFirstPasswordDto,
  ) {
    if (!(await this.access.requiresFamilyPasswordChange(userId))) {
      HttpError.conflict("The first-login password was already changed");
    }

    const user = await this.users.getAuthRecordById(userId);
    if (
      !user?.password ||
      !(await this.validator.comparePassword(
        input.currentPassword,
        user.password,
      ))
    ) {
      HttpError.badRequest("The current password is incorrect");
    }

    if (await this.validator.comparePassword(input.newPassword, user.password)) {
      HttpError.badRequest("Choose a different password");
    }

    const password = await this.encryption.hashPassword(input.newPassword);
    await this.userRecords.update(userId, { password });
    const completed = await this.access.completeFamilyPasswordChange(userId);
    if (!completed) {
      HttpError.conflict("The first-login password was already changed");
    }
  }
}
