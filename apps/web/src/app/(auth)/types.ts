import type { ReactNode } from "react";
import type { z } from "zod";

import type {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from "@/features/Auth/config/authSchemas";

export type AuthCardProps = Readonly<{
  children: ReactNode;
  description: string;
  footer?: ReactNode;
  title: string;
}>;

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type LoginFormProps = Readonly<{
  githubEnabled: boolean;
  googleEnabled: boolean;
  oauthErrorMessage?: string;
  redirectTo: string;
}>;
export type LoginValues = z.infer<typeof loginSchema>;
export type ResetPasswordFormProps = Readonly<{ token: string }>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
