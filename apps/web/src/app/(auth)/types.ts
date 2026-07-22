import type { ReactNode } from "react";
import type { z } from "zod";

import type {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  sponsorRegistrationSchema,
} from "@/features/Auth/config/authSchemas";
import type { KafilLanguage } from "@/lib/format";

export type AuthCardProps = Readonly<{
  children: ReactNode;
  description: string;
  footer?: ReactNode;
  title: string;
}>;

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type LoginFormProps = Readonly<{ redirectTo: string }>;
export type LoginValues = z.infer<typeof loginSchema>;
export type RegistrationValues = z.infer<typeof sponsorRegistrationSchema>;
export type ResetPasswordFormProps = Readonly<{ token: string }>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export type { KafilLanguage };
