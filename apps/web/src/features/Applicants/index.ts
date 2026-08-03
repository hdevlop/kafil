export {
  getApplicant,
  listApplicants,
  submitApplicant,
  getApplicantEmailOtpSetup,
  resendApplicantEmailOtp,
  confirmApplicantEmailOtp,
} from "./services/api";
export { ApplicantsPage } from "./components/ApplicantsPage";

export {
  applicantFormSchema,
  applicantEmailOtpSchema,
  applicantGenderOptions,
  type ApplicantFormValues,
  type ApplicantEmailOtpValues,
} from "./config/schemas";

export type {
  ApplicantEmailOtpSetup,
  ApplicantEmailOtpConfirmResult,
  ApplicantStatus,
  ApplicantStep,
  ApplicantSubmissionResult,
} from "./types";
