import { HttpError, Service } from "najm-core";

import { ApplicantRepository, type ApplicantRecord } from "./applicantRepository";

export type ApplicantStatus =
  | "pending_email_verification"
  | "pending_review"
  | "approved"
  | "rejected";

export interface ApplicantDuplicateCheckInput {
  email: string;
  phone: string;
  cin: string;
  excludeApplicantId?: string;
}

@Service()
export class ApplicantValidator {
  constructor(private readonly applicants: ApplicantRepository) {}

  async ensureExists(id: string): Promise<ApplicantRecord> {
    const applicant = await this.applicants.findById(id);
    if (!applicant) HttpError.notFound("Application not found");
    return applicant;
  }

  async ensureEmailAvailable(email: string, excludeApplicantId?: string) {
    const existing = await this.applicants.findByEmailInsensitive(email);
    if (existing && existing.id !== excludeApplicantId) {
      HttpError.conflict("An application with this email already exists");
    }
  }

  async ensurePhoneAvailable(phone: string, excludeApplicantId?: string) {
    const existing = await this.applicants.findByPhone(phone);
    if (existing && existing.id !== excludeApplicantId) {
      HttpError.conflict("An application with this phone number already exists");
    }
  }

  async ensureCinAvailable(cin: string, excludeApplicantId?: string) {
    const existing = await this.applicants.findByCin(cin);
    if (existing && existing.id !== excludeApplicantId) {
      HttpError.conflict("An application with this CIN already exists");
    }
  }

  /**
   * Reject reusing the same contact identity when an applicant has been
   * rejected. The parent sponsor workflow owns the reopen-and-appeal flow.
   */
  async ensureReusedIdentityAllowed(
    existing: ApplicantRecord,
    input: ApplicantDuplicateCheckInput,
  ) {
    if (existing.status === "rejected") {
      HttpError.conflict(
        "This application was rejected and cannot be reopened from the public form",
      );
    }
    if (existing.email.toLowerCase() !== input.email.toLowerCase()) {
      await this.ensureEmailAvailable(input.email, existing.id);
    }
    if (existing.phone !== input.phone) {
      await this.ensurePhoneAvailable(input.phone, existing.id);
    }
    if (existing.cin.toUpperCase() !== input.cin.toUpperCase()) {
      await this.ensureCinAvailable(input.cin, existing.id);
    }
  }
}
