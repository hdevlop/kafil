import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import {
  AuthService,
  CredentialSetupService,
  UserRepository,
  UserService,
} from "najm-auth";
import { Err, HttpError, Service } from "najm-core";
import { Transaction } from "najm-database";
import { EmailService } from "najm-email";

import { envConfig } from "../../config/envConfig";
import { normalizePhone } from "../access/phone";
import {
  type ApplicantListQuery,
  type CreateApplicantDto,
  type CreateApplicantInput,
  type SupportedApplicantLocale,
  applicantListQuery,
  createApplicantDto,
} from "./applicantDto";
import {
  ApplicantRepository,
  type ApplicantChallengeRecord,
  type ApplicantRecord,
} from "./applicantRepository";
import { ApplicantValidator } from "./applicantValidator";

export const APPLICANT_EMAIL_OTP_COOKIE = "kafil.applicant-email-otp";
export const APPLICANT_EMAIL_OTP_TTL_MS = 10 * 60 * 1_000;
export const APPLICANT_EMAIL_OTP_RESEND_COOLDOWN_MS = 60 * 1_000;
export const APPLICANT_EMAIL_OTP_MAX_ATTEMPTS = 5;
export const APPLICANT_EMAIL_OTP_PURPOSE = "applicant-email-otp";

const APPLICANT_EMAIL_OTP_OPTIONS = {
  cookieName: APPLICANT_EMAIL_OTP_COOKIE,
  purpose: APPLICANT_EMAIL_OTP_PURPOSE,
  ttlMs: APPLICANT_EMAIL_OTP_TTL_MS,
} as const;

type ApplicantStatus = ApplicantRecord["status"];
type ApplicantNextStep =
  | "applicant_email_otp"
  | "applicant_pending_review"
  | "applicant_approved"
  | "applicant_rejected";

interface OtpEmailCopy {
  subject: string;
  heading: string;
  instruction: string;
  expiry: string;
  warning: string;
}

const otpEmailCopy: Record<SupportedApplicantLocale, OtpEmailCopy> = {
  en: {
    subject: "Verify your Kafil sponsor application",
    heading: "Verify your Kafil application email",
    instruction: "Enter this code to finish your sponsor application:",
    expiry: "This code expires in 10 minutes.",
    warning: "Do not share this code with anyone.",
  },
  fr: {
    subject: "Vérifiez votre candidature de parrainage Kafil",
    heading: "Vérifiez l'e-mail de votre candidature Kafil",
    instruction: "Saisissez ce code pour terminer votre candidature de parrainage :",
    expiry: "Ce code expire dans 10 minutes.",
    warning: "Ne partagez ce code avec personne.",
  },
  ar: {
    subject: "تحقق من طلب رعايتك في كافل",
    heading: "تحقق من بريد طلبك في كافل",
    instruction: "أدخل هذا الرمز لإكمال طلب الرعاية:",
    expiry: "تنتهي صلاحية هذا الرمز خلال 10 دقائق.",
    warning: "لا تشارك هذا الرمز مع أي شخص.",
  },
  es: {
    subject: "Verifica tu solicitud de patrocinio de Kafil",
    heading: "Verifica el correo de tu solicitud Kafil",
    instruction: "Introduce este código para finalizar tu solicitud de patrocinio:",
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

export type SubmitApplicantResult =
  | {
      nextStep: "applicant_email_otp";
      status: "pending_email_verification";
      expiresAt: string;
      resendAvailableAt: string;
      maskedDestination: string;
      emailSent: boolean;
      reused: boolean;
    }
  | {
      nextStep: "applicant_pending_review";
      status: "pending_review";
      reused: true;
    }
  | {
      nextStep: "applicant_approved";
      status: "approved";
      reused: true;
    }
  | {
      nextStep: "applicant_rejected";
      status: "rejected";
      reused: true;
    };

export type ApplicantSetupResult = {
  nextStep: ApplicantNextStep;
  status: ApplicantStatus;
  expiresAt: string;
  resendAvailableAt: string;
  maskedDestination: string;
  emailSent: boolean;
};

export type ApplicantResendResult = ApplicantSetupResult & {
  accepted: true;
};

export type ApplicantConfirmResult = {
  nextStep: "applicant_pending_review";
  status: "pending_review";
  emailVerified: true;
};

export type ApplicantStatusResult = {
  nextStep: ApplicantNextStep;
  status: ApplicantStatus;
};

@Service()
export class ApplicantService {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UserService,
    private readonly userRecords: UserRepository,
    private readonly email: EmailService,
    private readonly applicants: ApplicantRepository,
    private readonly validator: ApplicantValidator,
    private readonly setup: CredentialSetupService,
  ) {}

  async list(query: ApplicantListQuery) {
    const { limit, offset } = applicantListQuery.parse(query ?? {});
    return this.applicants.list(limit, offset);
  }

  get(id: string) {
    return this.validator.ensureExists(id);
  }

  /**
   * Public submission. Atomically creates a pending Najm sponsor user and a
   * single applicant record, then begins a purpose-bound email-OTP setup
   * session. Repeated submissions for an unverified pending applicant
   * re-issue a bounded challenge without making a duplicate. Verified,
   * approved, and rejected applicants are returned through their lifecycle
   * outcomes without a public duplicate path.
   */
  @Transaction({ retries: 2 })
  async submit(input: CreateApplicantInput): Promise<SubmitApplicantResult> {
    const data = createApplicantDto.parse(input);
    const normalizedPhone = normalizePhone(data.phone);
    if (!normalizedPhone) {
      HttpError.badRequest("Enter a valid phone number with a country code");
    }
    const email = data.email.toLowerCase();
    const cin = data.cin.toUpperCase();

    const existing = await this.applicants.findByEmailInsensitive(email);
    if (existing) {
      return this.resubmitExisting(existing, {
        ...data,
        email,
        phone: normalizedPhone,
        cin,
      });
    }

    await this.validator.ensureEmailAvailable(email);
    await this.validator.ensurePhoneAvailable(normalizedPhone);
    await this.validator.ensureCinAvailable(cin);

    const user = await this.auth.registerUser({
      name: data.name,
      email,
      password: data.password,
    });
    await this.userRecords.update(user.id, {
      phone: normalizedPhone,
      phoneVerified: false,
      emailVerified: false,
      roleId: null,
    });

    const applicant = await this.applicants.create({
      authUserId: user.id,
      name: data.name,
      email,
      phone: normalizedPhone,
      cin,
      gender: data.gender,
      address: data.address,
      dateOfBirth: data.dateOfBirth,
      status: "pending_email_verification",
    });
    if (!applicant) {
      HttpError.internal("Could not create sponsor application");
    }

    const session = await this.setup.begin(user.id, APPLICANT_EMAIL_OTP_OPTIONS);
    const issued = await this.issueChallenge(
      applicant,
      user.email,
      user.name,
      data.locale ?? "en",
    );
    return {
      nextStep: "applicant_email_otp",
      status: "pending_email_verification",
      expiresAt: session.expiresAt,
      resendAvailableAt: issued.resendAvailableAt,
      maskedDestination: maskEmail(user.email),
      emailSent: issued.emailSent,
      reused: false,
    };
  }

  async setupSession(): Promise<ApplicantSetupResult> {
    const session = await this.setup.require(APPLICANT_EMAIL_OTP_OPTIONS);
    return this.describeSession(session.userId);
  }

  async resend(): Promise<ApplicantResendResult> {
    const session = await this.setup.require(APPLICANT_EMAIL_OTP_OPTIONS);
    const applicant = await this.applicants.findByAuthUserId(session.userId);
    if (!applicant) HttpError.unauthorized("Application session is unavailable");
    if (applicant.status !== "pending_email_verification") {
      HttpError.unauthorized("Application session is unavailable");
    }
    const user = await this.users.getById(session.userId);
    const current = await this.findChallenge(applicant.id);
    if (
      current &&
      !current.consumedAt &&
      current.resendAvailableAt.getTime() > Date.now()
    ) {
      Err("Please wait before requesting another activation code", 429);
    }
    const issued = await this.issueChallenge(
      applicant,
      user.email,
      user.name,
      (current?.locale as SupportedApplicantLocale | undefined) ?? "en",
    );
    return {
      ...this.toSetupResult(applicant, user.email, current),
      accepted: true as const,
      resendAvailableAt: issued.resendAvailableAt,
    };
  }

  async confirm(code: string): Promise<ApplicantConfirmResult> {
    const session = await this.setup.require(APPLICANT_EMAIL_OTP_OPTIONS);
    const applicant = await this.applicants.findByAuthUserId(session.userId);
    if (!applicant) HttpError.unauthorized("Application session is unavailable");
    if (applicant.status !== "pending_email_verification") {
      HttpError.unauthorized("Application session is unavailable");
    }
    const challenge = await this.findChallenge(applicant.id);
    const suppliedHash = this.hashCode(code);
    const matches =
      challenge &&
      !challenge.consumedAt &&
      challenge.expiresAt.getTime() > Date.now() &&
      challenge.attemptsRemaining > 0 &&
      timingSafeEqual(
        Buffer.from(challenge.codeHash),
        Buffer.from(suppliedHash),
      );

    if (!matches) {
      if (challenge && !challenge.consumedAt) {
        await this.applicants.decrementChallengeAttempts(
          applicant.id,
          challenge.codeHash,
        );
      }
      HttpError.badRequest("The activation code is invalid or expired");
    }

    return this.setup.consume(
      APPLICANT_EMAIL_OTP_OPTIONS,
      async ({ userId }) =>
        this.markReviewPending(userId, applicant!.id, suppliedHash),
    );
  }

  /**
   * Public lookup for the post-submit state. The visitor owns the
   * application via the setup cookie; we only return the lifecycle status.
   */
  async status(): Promise<ApplicantStatusResult> {
    const session = await this.setup.require(APPLICANT_EMAIL_OTP_OPTIONS);
    return this.describeSession(session.userId).then((result) => ({
      nextStep: result.nextStep,
      status: result.status,
    }));
  }

  private async describeSession(userId: string): Promise<ApplicantSetupResult> {
    const applicant = await this.applicants.findByAuthUserId(userId);
    if (!applicant) HttpError.unauthorized("Application session is unavailable");
    const user = await this.users.getById(userId);
    if (applicant.status === "pending_email_verification") {
      const challenge = await this.findChallenge(applicant.id);
      if (!challenge || challenge.consumedAt) {
        HttpError.unauthorized("Application session is unavailable");
      }
      return this.toSetupResult(applicant, user.email, challenge);
    }
    return this.toSetupResult(applicant, user.email, undefined);
  }

  private async resubmitExisting(
    existing: ApplicantRecord,
    data: CreateApplicantDto,
  ): Promise<SubmitApplicantResult> {
    await this.validator.ensureReusedIdentityAllowed(existing, {
      email: data.email,
      phone: data.phone,
      cin: data.cin,
    });

    if (existing.status === "approved") {
      return {
        nextStep: "applicant_approved",
        status: "approved",
        reused: true,
      };
    }
    if (existing.status === "rejected") {
      HttpError.conflict(
        "This application was rejected and cannot be reopened from the public form",
      );
    }
    if (existing.status === "pending_review") {
      return {
        nextStep: "applicant_pending_review",
        status: "pending_review",
        reused: true,
      };
    }

    const updated = await this.applicants.updateIdentity(existing.id, {
      name: data.name,
      email: data.email,
      phone: data.phone,
      cin: data.cin,
      gender: data.gender,
      address: data.address,
      dateOfBirth: data.dateOfBirth,
    });
    if (!updated) HttpError.internal("Could not update sponsor application");

    const user = await this.users.getById(existing.authUserId);
    const session = await this.setup.begin(
      existing.authUserId,
      APPLICANT_EMAIL_OTP_OPTIONS,
    );
    const issued = await this.issueChallenge(
      updated,
      user.email,
      user.name,
      data.locale ?? "en",
    );
    return {
      nextStep: "applicant_email_otp",
      status: "pending_email_verification",
      expiresAt: session.expiresAt,
      resendAvailableAt: issued.resendAvailableAt,
      maskedDestination: maskEmail(user.email ?? ""),
      emailSent: issued.emailSent,
      reused: true,
    };
  }

  private async markReviewPending(
    userId: string,
    applicantId: string,
    suppliedHash: string,
  ): Promise<ApplicantConfirmResult> {
    const consumed = await this.applicants.consumeChallenge(applicantId, suppliedHash);
    if (!consumed) {
      HttpError.badRequest("The activation code is invalid or expired");
    }
    const updated = await this.applicants.markReviewPending(applicantId);
    if (!updated) {
      HttpError.unauthorized("Application session is unavailable");
    }
    await this.users.update(userId, {
      emailVerified: true,
      status: "pending",
    });
    return {
      nextStep: "applicant_pending_review",
      status: "pending_review",
      emailVerified: true,
    };
  }

  private async issueChallenge(
    applicant: ApplicantRecord,
    email: string | null | undefined,
    name: string | null | undefined,
    locale: SupportedApplicantLocale,
  ) {
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const expiresAt = new Date(Date.now() + APPLICANT_EMAIL_OTP_TTL_MS);
    const resendAvailableAt = new Date(
      Date.now() + APPLICANT_EMAIL_OTP_RESEND_COOLDOWN_MS,
    );

    await this.applicants.replaceChallenge({
      applicantId: applicant.id,
      authUserId: applicant.authUserId,
      codeHash: this.hashCode(code),
      expiresAt,
      resendAvailableAt,
      attemptsRemaining: APPLICANT_EMAIL_OTP_MAX_ATTEMPTS,
      emailSent: false,
      locale,
      consumedAt: null,
    });

    const copy = otpEmailCopy[locale] ?? otpEmailCopy.en;
    const direction = locale === "ar" ? "rtl" : "ltr";
    const recipient = (name ?? "") || (email ?? "");
    const html = `<!doctype html><html dir="${direction}"><body style="font-family:Arial,sans-serif;line-height:1.6"><h2>${escapeHtml(copy.heading)}</h2><p>${escapeHtml(recipient)},</p><p>${escapeHtml(copy.instruction)}</p><p style="font-size:32px;font-weight:700;letter-spacing:8px">${code}</p><p>${escapeHtml(copy.expiry)}</p><p><strong>${escapeHtml(copy.warning)}</strong></p></body></html>`;
    let emailSent = false;
    try {
      if (email) {
        const result = await this.email.sendHtml(email, copy.subject, html);
        emailSent = result.success;
      }
    } catch {
      emailSent = false;
    }
    await this.applicants.setChallengeDelivery(
      applicant.id,
      this.hashCode(code),
      emailSent,
    );

    return {
      emailSent,
      resendAvailableAt: resendAvailableAt.toISOString(),
    };
  }

  private toSetupResult(
    applicant: ApplicantRecord,
    email: string,
    challenge: ApplicantChallengeRecord | undefined,
  ): ApplicantSetupResult {
    return {
      nextStep: this.nextStepFor(applicant.status),
      status: applicant.status,
      expiresAt:
        challenge?.expiresAt.toISOString() ??
        new Date(Date.now() + APPLICANT_EMAIL_OTP_TTL_MS).toISOString(),
      resendAvailableAt:
        challenge?.resendAvailableAt.toISOString() ?? new Date().toISOString(),
      maskedDestination: maskEmail(email),
      emailSent: challenge?.emailSent ?? false,
    };
  }

  private nextStepFor(status: ApplicantStatus): ApplicantNextStep {
    switch (status) {
      case "pending_email_verification":
        return "applicant_email_otp";
      case "pending_review":
        return "applicant_pending_review";
      case "approved":
        return "applicant_approved";
      case "rejected":
        return "applicant_rejected";
      default:
        return "applicant_email_otp";
    }
  }

  private async findChallenge(applicantId: string) {
    return this.applicants.findChallengeByApplicant(applicantId);
  }

  private hashCode(code: string) {
    const key = envConfig.auth.encryptionKey;
    if (!key) Err("NAJM_ENCRYPTION_KEY is required", 500);
    return createHmac("sha256", Buffer.from(key, "hex"))
      .update(code)
      .digest("hex");
  }
}
