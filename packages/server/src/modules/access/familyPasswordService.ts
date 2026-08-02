import {
  CredentialSetupService,
  EncryptionService,
  UserRepository,
  UserService,
  UserValidator,
} from "najm-auth";
import { HttpError, Service } from "najm-core";

import type { FamilyFirstPasswordDto } from "./accessDto";
import { familyFirstPasswordDto } from "./accessDto";
import { AccessRepository } from "./accessRepository";

export const FAMILY_PASSWORD_SETUP_COOKIE = "kafil.family-setup";
export const FAMILY_PASSWORD_SETUP_TTL_MS = 10 * 60 * 1_000;
const FAMILY_PASSWORD_SETUP_OPTIONS = {
  cookieName: FAMILY_PASSWORD_SETUP_COOKIE,
  purpose: "family-password",
  ttlMs: FAMILY_PASSWORD_SETUP_TTL_MS,
} as const;

@Service()
export class FamilyPasswordService {
  constructor(
    private readonly users: UserService,
    private readonly userRecords: UserRepository,
    private readonly validator: UserValidator,
    private readonly encryption: EncryptionService,
    private readonly setup: CredentialSetupService,
    private readonly access: AccessRepository,
  ) {}

  async begin(userId: string) {
    const session = await this.setup.begin(
      userId,
      FAMILY_PASSWORD_SETUP_OPTIONS,
    );

    return {
      setupRequired: true as const,
      expiresAt: session.expiresAt,
    };
  }

  async requirement() {
    const session = await this.setup.require(FAMILY_PASSWORD_SETUP_OPTIONS);

    return {
      setupRequired: true as const,
      expiresAt: session.expiresAt,
    };
  }

  async change(data: FamilyFirstPasswordDto) {
    const input = familyFirstPasswordDto.parse(data);
    await this.setup.consume(
      FAMILY_PASSWORD_SETUP_OPTIONS,
      ({ userId }) => this.persistPassword(userId, input),
    );

    return { changed: true, signInAgain: true };
  }

  async cancel() {
    return this.setup.cancel(FAMILY_PASSWORD_SETUP_OPTIONS);
  }

  private async persistPassword(
    userId: string,
    input: FamilyFirstPasswordDto,
  ) {
    if (!(await this.access.requiresFamilyPasswordChange(userId))) {
      HttpError.conflict("The first-login password was already changed");
    }

    const user = await this.users.getAuthRecordById(userId);
    if (!user?.password) HttpError.unauthorized("Family account is unavailable");

    if (await this.validator.comparePassword(input.newPassword, user.password)) {
      HttpError.badRequest("Choose a different password");
    }

    const password = await this.encryption.hashPassword(input.newPassword);
    await this.userRecords.update(userId, { password });
    const completed = await this.access.completeFamilyPasswordChange(userId);
    if (!completed) {
      HttpError.conflict("The first-login password was already changed");
    }

    return userId;
  }
}
