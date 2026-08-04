export {
  getApplicant,
  listApplicants,
  approveApplicant,
  rejectApplicant,
  submitApplicant,
  getApplicantEmailOtpSetup,
  resendApplicantEmailOtp,
  confirmApplicantEmailOtp,
  type ListApplicantsParams,
} from "./services/api";
export { ApplicantsPage } from "./components/ApplicantsPage";

export {
  applicantFormSchema,
  applicantEmailOtpSchema,
  applicantGenderOptions,
  applicantRejectReasonSchema,
  type ApplicantFormValues,
  type ApplicantEmailOtpValues,
  type ApplicantRejectReasonValues,
} from "./config/schemas";

export type {
  ApplicantEmailOtpSetup,
  ApplicantEmailOtpConfirmResult,
  ApplicantDecisionPayload,
  ApplicantStatus,
  ApplicantStep,
  ApplicantSubmissionResult,
} from "./types";
