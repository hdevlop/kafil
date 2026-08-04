import { z } from "zod";

import { isFamilyCinCredential } from "./initialPassword";

export const accessLoginDto = z.object({
  identifier: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(72),
  rememberMe: z.boolean().optional().default(false),
  locale: z.enum(["en", "fr", "ar", "es"]).optional().default("en"),
});

export const familyFirstPasswordDto = z.object({
  newPassword: z
    .string()
    .min(8, "Use at least 8 characters")
    .max(72, "Use at most 72 characters")
    .regex(/^[a-z0-9]+$/, "Use lowercase letters and numbers only")
    .regex(/[a-z]/, "Include at least one letter")
    .regex(/\d/, "Include at least one number")
    .refine((value) => !isFamilyCinCredential(value), {
      message: "Choose a password that is not a CIN",
    }),
});

export type AccessLoginDto = z.input<typeof accessLoginDto>;
export type FamilyFirstPasswordDto = z.infer<typeof familyFirstPasswordDto>;
