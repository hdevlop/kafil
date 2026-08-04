export type ApplicantStatus =
  | "pending_email_verification"
  | "pending_review"
  | "approved"
  | "rejected";

export interface ApplicantRecord {
  id: string;
  authUserId: string;
  name: string;
  email: string;
  phone: string;
  cin: string;
  gender: "M" | "F";
  status: ApplicantStatus;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ApplicantEmailOtpNextStep = "applicant_email_otp";
export type ApplicantEmailConfirmedNextStep = "applicant_pending_review";

export interface ApplicantSubmissionResult {
  nextStep: "applicant_email_otp";
  status: "pending_email_verification";
  expiresAt: string;
  resendAvailableAt: string;
  maskedDestination: string;
  emailSent: boolean;
  reused: boolean;
}

export interface ApplicantAlreadySubmittedResult {
  nextStep: "applicant_pending_review" | "applicant_approved" | "applicant_rejected";
  status: "pending_review" | "approved" | "rejected";
  reused: true;
}

export type ApplicantSubmissionResponse = ApplicantSubmissionResult | ApplicantAlreadySubmittedResult;

export interface ApplicantEmailOtpSetup {
  nextStep: ApplicantEmailOtpNextStep;
  expiresAt: string;
  resendAvailableAt: string;
  maskedDestination: string;
  emailSent: boolean;
}

export interface ApplicantEmailOtpConfirmResult {
  nextStep: ApplicantEmailConfirmedNextStep;
}

export type ApplicantStep =
  | { kind: "form" }
  | { kind: "otp"; setup: ApplicantEmailOtpSetup }
  | { kind: "pending_review"; destination: string };

export interface ApplicantDecisionPayload {
  id: string;
  authUserId: string;
  name: string;
  email: string;
  phone: string;
  cin: string;
  gender: "M" | "F";
  status: ApplicantStatus;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  sponsorProfileId?: string;
}
