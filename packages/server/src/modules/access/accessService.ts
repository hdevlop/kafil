import { AuthService } from "najm-auth";
import { Service } from "najm-core";

import type { AccessLoginDto } from "./accessDto";
import { AccessRepository } from "./accessRepository";
import { FamilyPasswordService } from "./familyPasswordService";
import { normalizeFamilyCinCredential } from "./initialPassword";
import { normalizePhone } from "./phone";

@Service()
export class AccessService {
  constructor(
    private readonly auth: AuthService,
    private readonly access: AccessRepository,
    private readonly familyPasswords: FamilyPasswordService,
  ) {}

  async login({
    identifier,
    password,
    rememberMe: _rememberMe = false,
    locale: _locale = "en",
  }: AccessLoginDto) {
    const normalizedIdentifier = identifier.includes("@")
      ? identifier.trim().toLowerCase()
      : normalizePhone(identifier) ?? identifier;
    const credentials = {
      identifier: normalizedIdentifier,
      password: normalizeFamilyCinCredential(password),
    };

    const user = await this.auth.verifyCredentials(credentials);
    const setupRequired =
      user.role === "family" &&
      (await this.access.requiresFamilyPasswordChange(user.id));

    if (setupRequired) {
      const result = await this.familyPasswords.begin(user.id);
      return { ...result, nextStep: "family_password_setup" as const };
    }

    const result = await this.auth.establishSession(user);
    return { ...result, nextStep: "authenticated" as const };
  }
}
