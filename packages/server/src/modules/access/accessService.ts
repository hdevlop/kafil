import { createHash, randomBytes } from "node:crypto";
import { AuthService, UserRepository, UserService } from "najm-auth";
import { HttpError, Service } from "najm-core";
import { Transaction } from "najm-database";
import { EmailService, emailVerificationTemplate } from "najm-email";

import { envConfig } from "../../config/envConfig";
import type {
  AccessLoginDto,
  SponsorAccessRegistrationDto,
} from "./accessDto";
import { AccessRepository } from "./accessRepository";
import { normalizePhone } from "./phone";

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1_000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

@Service()
export class AccessService {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UserService,
    private readonly userRecords: UserRepository,
    private readonly email: EmailService,
    private readonly access: AccessRepository,
  ) {}

  async login({ identifier, password }: AccessLoginDto) {
    let email = identifier;

    if (!identifier.includes("@")) {
      const phone = normalizePhone(identifier);
      const user = phone ? await this.userRecords.findByPhone(phone) : undefined;
      // Keep the missing-user path timing-safe by delegating to Najm Auth's
      // normal dummy-hash login behavior.
      email = user?.email ?? "missing-phone@invalid.kafil";
    }

    const result = await this.auth.loginUser({ email, password });
    const mustChangePassword =
      result.user.role === "family" &&
      (await this.access.requiresFamilyPasswordChange(result.user.id));

    return { ...result, mustChangePassword };
  }

  async registerSponsor(data: SponsorAccessRegistrationDto) {
    const user = await this.createPendingSponsor(data);
    const emailSent = await this.sendVerification(user.id, user.email, user.name);
    return { emailSent };
  }

  async requestVerification(email: string) {
    const user = await this.users.findByEmail(email);
    if (user && user.status === "pending" && !user.emailVerified) {
      await this.sendVerification(user.id, user.email, user.name);
    }

    // Deliberately generic to prevent account enumeration.
    return { accepted: true };
  }

  @Transaction({ retries: 2 })
  async confirmVerification(token: string) {
    const tokenHash = hashToken(token);
    const claimed = await this.access.consumeVerificationToken(tokenHash);
    if (!claimed) {
      const previous = await this.access.findVerificationToken(tokenHash);
      if (previous?.usedAt) {
        const user = await this.users.getById(previous.userId);
        if (user.emailVerified) return { verified: true };
      }
      HttpError.badRequest("This verification link is invalid or expired");
    }

    await this.users.update(claimed.userId, {
      emailVerified: true,
      status: "active",
    });
    return { verified: true };
  }

  @Transaction({ retries: 2 })
  private createPendingSponsor(data: SponsorAccessRegistrationDto) {
    return this.auth.registerUser(data);
  }

  private async sendVerification(
    userId: string,
    email: string,
    name?: string | null,
  ) {
    const token = randomBytes(32).toString("base64url");
    await this.access.replaceVerificationToken({
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
    });

    const frontendUrl = envConfig.auth.frontendUrl ?? "http://localhost:3000";
    const verificationLink = `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;
    try {
      const result = await this.email.sendHtml(
        email,
        "Verify your Kafil email",
        emailVerificationTemplate({
          verificationLink,
          userName: name || email,
        }),
      );
      return result.success;
    } catch {
      return false;
    }
  }
}
