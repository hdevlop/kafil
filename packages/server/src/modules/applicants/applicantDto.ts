import { z } from "zod";

import { phoneDto } from "../access/phone";

const applicantStatusSchema = z.enum([
  "pending_email_verification",
  "pending_review",
  "approved",
  "rejected",
]);

export const applicantDecisionStatus = z.enum([
  "pending_email_verification",
  "pending_review",
  "approved",
  "rejected",
]);
export type ApplicantDecisionStatus = z.infer<typeof applicantDecisionStatus>;

export const supportedApplicantLocales = ["en", "fr", "ar", "es"] as const;
export type SupportedApplicantLocale =
  (typeof supportedApplicantLocales)[number];

const applicantPasswordDto = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Use at most 72 characters");

const applicantIdentityDto = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: phoneDto,
  cin: z
    .string()
    .trim()
    .min(8, "CIN must be at least 8 characters")
    .max(20, "CIN must be at most 20 characters")
    .transform((value) => value.toUpperCase()),
  gender: z.enum(["M", "F", "male", "female"]).transform((value) =>
    value === "male" ? "M" : value === "female" ? "F" : value,
  ),
  locale: z.enum(supportedApplicantLocales).optional().default("en"),
});

export const createApplicantDto = applicantIdentityDto.extend({
  password: applicantPasswordDto,
});

export type CreateApplicantDto = z.output<typeof createApplicantDto>;
export type CreateApplicantInput = z.input<typeof createApplicantDto>;

export const applicantEmailOtpConfirmDto = z.object({
  code: z.string().regex(/^\d{6}$/),
});

export type ApplicantEmailOtpConfirmDto = z.input<
  typeof applicantEmailOtpConfirmDto
>;

export const applicantIdParams = z.object({
  id: z.string().uuid(),
});

export type ApplicantIdParams = z.infer<typeof applicantIdParams>;

export const applicantStatusDto = applicantStatusSchema;

export const applicantListQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  status: applicantDecisionStatus.optional(),
  search: z.string().trim().max(120).optional(),
});

export const applicantCountQuery = z.object({
  status: applicantDecisionStatus.default("pending_review"),
});
export type ApplicantCountQuery = z.input<typeof applicantCountQuery>;

export const rejectApplicantDto = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "Provide a rejection reason")
    .max(500, "Rejection reason is too long"),
});
export type RejectApplicantDto = z.input<typeof rejectApplicantDto>;
export type RejectApplicantInput = z.input<typeof rejectApplicantDto>;

export const applicantDecisionActionDto = z.object({
  id: z.string().uuid(),
});
export type ApplicantDecisionActionInput = z.input<
  typeof applicantDecisionActionDto
>;

export type ApplicantStatus = z.infer<typeof applicantStatusDto>;
export type ApplicantListQuery = z.input<typeof applicantListQuery>;
