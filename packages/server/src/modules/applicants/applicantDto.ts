import { z } from "zod";

import { phoneDto } from "../access/phone";

const applicantStatusSchema = z.enum([
  "pending_email_verification",
  "pending_review",
  "approved",
  "rejected",
]);

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
    .min(8)
    .max(20)
    .transform((value) => value.toUpperCase()),
  gender: z.enum(["M", "F", "male", "female"]).transform((value) =>
    value === "male" ? "M" : value === "female" ? "F" : value,
  ),
  address: z.string().trim().min(1).max(500),
  dateOfBirth: z.iso.date(),
  locale: z.enum(supportedApplicantLocales).optional().default("en"),
});

export const createApplicantDto = applicantIdentityDto
  .extend({
    password: applicantPasswordDto,
    confirmPassword: applicantPasswordDto,
  })
  .refine((input) => input.password === input.confirmPassword, {
    message: "Password confirmation does not match",
    path: ["confirmPassword"],
  })
  .transform((input) => {
    const { confirmPassword, ...rest } = input;
    void confirmPassword;
    return rest;
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
});

export type ApplicantStatus = z.infer<typeof applicantStatusDto>;
export type ApplicantListQuery = z.input<typeof applicantListQuery>;
