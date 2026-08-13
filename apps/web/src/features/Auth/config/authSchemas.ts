import { z } from "zod";

const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/\d/, "Password must contain a number");

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your email or phone number"),
  password: z.string().min(1, "Enter your password"),
  rememberMe: z.boolean().default(false),
});

export const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    newPassword: password,
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const easyFamilyPassword = z
  .string()
  .min(8, "Use at least 8 characters")
  .refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    "Use at most 72 bytes",
  )
  .regex(/[a-zA-Z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number")
  .refine(
    (value) =>
      !(
        value.length >= 8 &&
        value.length <= 20 &&
        /^[a-z]{1,3}\d{5,17}$/.test(value)
      ),
    "Choose a password that is not a CIN",
  );

export const familyFirstPasswordSchema = z
  .object({
    newPassword: easyFamilyPassword,
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type FamilyFirstPasswordValues = z.infer<
  typeof familyFirstPasswordSchema
>;
