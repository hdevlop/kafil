import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import {
  AuthService,
  CredentialSetupService,
  UserService,
} from "najm-auth";
import { Err, HttpError, Service } from "najm-core";
import { EmailService } from "najm-email";

import { envConfig } from "../../config/envConfig";
import type {
  AccessLoginDto,
  SponsorAccessRegistrationDto,
} from "./accessDto";
import { AccessRepository } from "./accessRepository";
import { FamilyPasswordService } from "./familyPasswordService";
import { normalizeFamilyCinCredential } from "./initialPassword";
import { normalizePhone } from "./phone";

export const SPONSOR_EMAIL_OTP_COOKIE = "kafil.sponsor-email-otp";
export const SPONSOR_EMAIL_OTP_TTL_MS = 10 * 60 * 1_000;
export const SPONSOR_EMAIL_OTP_RESEND_COOLDOWN_MS = 60 * 1_000;
export const SPONSOR_EMAIL_OTP_MAX_ATTEMPTS = 5;

const SPONSOR_EMAIL_OTP_OPTIONS = {
  cookieName: SPONSOR_EMAIL_OTP_COOKIE,
  purpose: "sponsor-email-otp",
  ttlMs: SPONSOR_EMAIL_OTP_TTL_MS,
} as const;

type SupportedLocale = "en" | "fr" | "ar" | "es";

const otpEmailCopy: Record<SupportedLocale, {
  subject: string;
  heading: string;
  instruction: string;
  expiry: string;
  warning: string;
}> = {
  en: {
    subject: "Your Kafil activation code",
    heading: "Verify your Kafil email",
    instruction: "Enter this activation code to finish signing in:",
    expiry: "This code expires in 10 minutes.",
    warning: "Do not share this code with anyone.",
  },
  fr: {
    subject: "Votre code d’activation Kafil",
    heading: "Vérifiez votre adresse e-mail Kafil",
    instruction: "Saisissez ce code d’activation pour terminer la connexion :",
    expiry: "Ce code expire dans 10 minutes.",
    warning: "Ne partagez ce code avec personne.",
  },
  ar: {
    subject: "رمز تفعيل حسابك في كافل",
    heading: "تحقق من بريدك الإلكتروني في كافل",
    instruction: "أدخل رمز التفعيل هذا لإكمال تسجيل الدخول:",
    expiry: "تنتهي صلاحية هذا الرمز خلال 10 دقائق.",
    warning: "لا تشارك هذا الرمز مع أي شخص.",
  },
  es: {
    subject: "Tu código de activación de Kafil",
    heading: "Verifica tu correo de Kafil",
    instruction: "Introduce este código de activación para completar el acceso:",
    expiry: "Este código caduca en 10 minutos.",
    warning: "No compartas este código con nadie.",
  },
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;",
  })[character] ?? character);
}

function maskEmail(email: string) {
  const [local = "", domain = ""] = email.split("@");
  const localHint = local ? `${local.slice(0, 1)}***` : "***";
  const [domainName = "", ...suffix] = domain.split(".");
  const domainHint = domainName ? `${domainName.slice(0, 1)}***` : "***";
  return `${localHint}@${domainHint}${suffix.length ? `.${suffix.join(".")}` : ""}`;
}

@Service()
export class AccessService {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UserService,
    private readonly email: EmailService,
    private readonly access: AccessRepository,
    private readonly familyPasswords: FamilyPasswordService,
    private readonly setup: CredentialSetupService,
  ) {}

  async login({
    identifier,
    password,
    rememberMe = false,
    locale = "en",
  }: AccessLoginDto) {
    const normalizedIdentifier = identifier.includes("@")
      ? identifier.trim().toLowerCase()
      : normalizePhone(identifier) ?? identifier;
    const credentials = {
      identifier: normalizedIdentifier,
      password: normalizeFamilyCinCredential(password),
    };
    const candidate = await this.findCandidate(normalizedIdentifier);

    if (
      candidate?.role?.toLowerCase() === "sponsor" &&
      candidate.status === "pending" &&
      !candidate.emailVerified
    ) {
      const user = await this.auth.verifyPendingCredentials(credentials, "sponsor");
      const issued = await this.issueChallenge(
        user.id,
        user.email,
        user.name,
        rememberMe,
        locale,
      );
      const session = await this.setup.begin(user.id, SPONSOR_EMAIL_OTP_OPTIONS);
      return {
        nextStep: "sponsor_email_otp" as const,
        expiresAt: session.expiresAt,
        resendAvailableAt: issued.resendAvailableAt,
        maskedDestination: maskEmail(user.email),
        emailSent: issued.emailSent,
      };
    }

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

  async registerSponsor(data: SponsorAccessRegistrationDto) {
    const existing = await this.users.findByEmailInsensitive(data.email);
    if (
      existing?.role?.toLowerCase() === "sponsor" &&
      existing.status === "pending" &&
      !existing.emailVerified
    ) {
      const issued = await this.issueChallenge(
        existing.id,
        existing.email,
        existing.name,
        false,
        data.locale ?? "en",
      );
      return { emailSent: issued.emailSent };
    }

    const { locale = "en", ...registration } = data;
    const user = await this.auth.registerUser(registration);
    const issued = await this.issueChallenge(
      user.id,
      user.email,
      user.name,
      false,
      locale,
    );
    return { emailSent: issued.emailSent };
  }

  async verificationSetup() {
    const session = await this.setup.require(SPONSOR_EMAIL_OTP_OPTIONS);
    const user = await this.requirePendingSponsor(session.userId);
    const challenge = await this.access.findSponsorEmailOtpChallenge(user.id);
    if (!challenge || challenge.consumedAt) {
      HttpError.unauthorized("Email verification session is unavailable");
    }

    return {
      nextStep: "sponsor_email_otp" as const,
      expiresAt: challenge.expiresAt.toISOString(),
      resendAvailableAt: challenge.resendAvailableAt.toISOString(),
      maskedDestination: maskEmail(user.email),
      emailSent: challenge.emailSent,
    };
  }

  async resendVerification() {
    const session = await this.setup.require(SPONSOR_EMAIL_OTP_OPTIONS);
    const user = await this.requirePendingSponsor(session.userId);
    const current = await this.access.findSponsorEmailOtpChallenge(user.id);
    const now = Date.now();
    if (current && !current.consumedAt && current.resendAvailableAt.getTime() > now) {
      Err("Please wait before requesting another activation code", 429);
    }

    const issued = await this.issueChallenge(
      user.id,
      user.email,
      user.name,
      current?.rememberMe ?? false,
      (current?.locale as SupportedLocale | undefined) ?? "en",
    );
    return {
      accepted: true as const,
      expiresAt: issued.expiresAt,
      resendAvailableAt: issued.resendAvailableAt,
      maskedDestination: maskEmail(user.email),
      emailSent: issued.emailSent,
    };
  }

  async confirmVerification(code: string) {
    const session = await this.setup.require(SPONSOR_EMAIL_OTP_OPTIONS);
    const challenge = await this.access.findSponsorEmailOtpChallenge(session.userId);
    const suppliedHash = this.hashCode(code);
    const valid = challenge &&
      !challenge.consumedAt &&
      challenge.expiresAt.getTime() > Date.now() &&
      challenge.attemptsRemaining > 0 &&
      timingSafeEqual(Buffer.from(challenge.codeHash), Buffer.from(suppliedHash));

    if (!valid) {
      if (challenge && !challenge.consumedAt) {
        await this.access.decrementSponsorEmailOtpAttempts(
          session.userId,
          challenge.codeHash,
        );
      }
      HttpError.badRequest("The activation code is invalid or expired");
    }

    return this.setup.consume(SPONSOR_EMAIL_OTP_OPTIONS, async ({ userId }) => {
      const consumed = await this.access.consumeSponsorEmailOtpChallenge(
        userId,
        suppliedHash,
      );
      if (!consumed) {
        HttpError.badRequest("The activation code is invalid or expired");
      }

      const user = await this.requirePendingSponsor(userId);
      await this.users.update(userId, {
        emailVerified: true,
        status: "active",
      });
      const activeUser = { ...user, emailVerified: true, status: "active" as const };
      const authenticated = await this.auth.establishSession(activeUser);
      return {
        ...authenticated,
        nextStep: "authenticated" as const,
        rememberMe: consumed.rememberMe,
      };
    });
  }

  async cancelVerification() {
    const session = await this.setup.require(SPONSOR_EMAIL_OTP_OPTIONS);
    await this.access.revokeSponsorEmailOtpChallenge(session.userId);
    return this.setup.cancel(SPONSOR_EMAIL_OTP_OPTIONS);
  }

  private async findCandidate(identifier: string) {
    if (identifier.includes("@")) {
      return this.users.findByEmailInsensitive(identifier);
    }
    const phoneUser = await this.users.findByPhone(identifier);
    return phoneUser ? this.users.findByEmail(phoneUser.email) : undefined;
  }

  private async requirePendingSponsor(userId: string) {
    const user = await this.users.getById(userId);
    if (
      user.role?.toLowerCase() !== "sponsor" ||
      user.status !== "pending" ||
      user.emailVerified
    ) {
      HttpError.unauthorized("Email verification session is unavailable");
    }
    return user;
  }

  private async issueChallenge(
    userId: string,
    email: string,
    name: string | null | undefined,
    rememberMe: boolean,
    locale: SupportedLocale,
  ) {
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const expiresAt = new Date(Date.now() + SPONSOR_EMAIL_OTP_TTL_MS);
    const resendAvailableAt = new Date(
      Date.now() + SPONSOR_EMAIL_OTP_RESEND_COOLDOWN_MS,
    );
    await this.access.replaceSponsorEmailOtpChallenge({
      userId,
      codeHash: this.hashCode(code),
      expiresAt,
      resendAvailableAt,
      attemptsRemaining: SPONSOR_EMAIL_OTP_MAX_ATTEMPTS,
      rememberMe,
      emailSent: false,
      locale,
      consumedAt: null,
    });

    const copy = otpEmailCopy[locale] ?? otpEmailCopy.en;
    const direction = locale === "ar" ? "rtl" : "ltr";
    const html = `<!doctype html><html dir="${direction}"><body style="font-family:Arial,sans-serif;line-height:1.6"><h2>${escapeHtml(copy.heading)}</h2><p>${escapeHtml(name || email)},</p><p>${escapeHtml(copy.instruction)}</p><p style="font-size:32px;font-weight:700;letter-spacing:8px">${code}</p><p>${escapeHtml(copy.expiry)}</p><p><strong>${escapeHtml(copy.warning)}</strong></p></body></html>`;
    let emailSent = false;
    try {
      const result = await this.email.sendHtml(email, copy.subject, html);
      emailSent = result.success;
    } catch {
      emailSent = false;
    }
    await this.access.setSponsorEmailOtpDelivery(userId, this.hashCode(code), emailSent);

    return {
      emailSent,
      expiresAt: expiresAt.toISOString(),
      resendAvailableAt: resendAvailableAt.toISOString(),
    };
  }

  private hashCode(code: string) {
    const key = envConfig.auth.encryptionKey;
    if (!key) Err("NAJM_ENCRYPTION_KEY is required", 500);
    return createHmac("sha256", Buffer.from(key, "hex"))
      .update(code)
      .digest("hex");
  }
}
