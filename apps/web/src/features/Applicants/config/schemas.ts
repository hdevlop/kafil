import { z } from "zod";

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
  .min(7, "CIN must be at least 7 characters")
  .max(20, "CIN must be at most 20 characters");

const gender = z.enum(["female", "male"], {
  message: "Choose your gender",
});

export const applicantFormSchema = z.object({
  name,
  email,
  phone,
  cin,
  gender,
  password,
});

export type ApplicantFormValues = z.infer<typeof applicantFormSchema>;

export const applicantEmailOtpSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the six-digit verification code"),
});

export type ApplicantEmailOtpValues = z.infer<typeof applicantEmailOtpSchema>;

export function applicantRejectReasonSchema(messages: {
  required: string;
  tooLong: string;
}) {
  return z.object({
    reason: z
      .string()
      .trim()
      .min(3, messages.required)
      .max(500, messages.tooLong),
  });
}

export type ApplicantRejectReasonValues = z.infer<
  ReturnType<typeof applicantRejectReasonSchema>
>;

export const applicantGenderOptions = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
] as const;
