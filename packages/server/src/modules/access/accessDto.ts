import { registerDto } from "najm-auth";
import { z } from "zod";

export const accessLoginDto = z.object({
  identifier: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(72),
});

export const sponsorAccessRegistrationDto = registerDto;

export const requestEmailVerificationDto = z.object({
  email: z.email(),
});

export const confirmEmailVerificationDto = z.object({
  token: z.string().min(32).max(200),
});

export const familyFirstPasswordDto = z.object({
  currentPassword: z.string().min(1).max(72),
  newPassword: z
    .string()
    .min(8, "Use at least 8 characters")
    .max(72, "Use at most 72 characters")
    .regex(/^[a-z0-9]+$/, "Use lowercase letters and numbers only")
    .regex(/[a-z]/, "Include at least one letter")
    .regex(/\d/, "Include at least one number"),
});

export type AccessLoginDto = z.infer<typeof accessLoginDto>;
export type SponsorAccessRegistrationDto = z.infer<
  typeof sponsorAccessRegistrationDto
>;
export type RequestEmailVerificationDto = z.infer<
  typeof requestEmailVerificationDto
>;
export type ConfirmEmailVerificationDto = z.infer<
  typeof confirmEmailVerificationDto
>;
export type FamilyFirstPasswordDto = z.infer<typeof familyFirstPasswordDto>;
