import { z } from "zod";

import { localDateInput } from "@/lib/date";

const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/\d/, "Password must contain a number");

const name = z
  .string()
  .trim()
  .min(2, "Enter your full name")
  .max(120, "Enter your full name");

const email = z
  .string()
  .trim()
  .email("Enter a valid email address")
  .max(254, "Enter a valid email address")
  .transform((value) => value.toLowerCase());

const phone = z
  .string()
  .trim()
  .min(7, "Enter a valid phone number")
  .max(20, "Enter a valid phone number")
  .regex(/^[+\d][\d\s().-]*$/, "Enter a valid phone number");

const cin = z
  .string()
  .trim()
  .min(4, "Enter your national identity number")
  .max(32, "Enter your national identity number");

const gender = z.enum(["female", "male"], {
  message: "Choose your gender",
});

const address = z
  .string()
  .trim()
  .min(4, "Enter your address")
  .max(240, "Enter your address");

const dateOfBirth = z
  .iso
  .date("Enter a valid date of birth")
  .refine((value) => value <= localDateInput(), {
    message: "Date of birth cannot be in the future",
  });

export const applicantFormSchema = z
  .object({
    name,
    email,
    phone,
    cin,
    gender,
    address,
    dateOfBirth,
    password,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ApplicantFormValues = z.infer<typeof applicantFormSchema>;

export const applicantEmailOtpSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the six-digit verification code"),
});

export type ApplicantEmailOtpValues = z.infer<typeof applicantEmailOtpSchema>;

export const applicantGenderOptions = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
] as const;
