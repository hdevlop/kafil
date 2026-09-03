"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useResetPassword } from "najm-auth/client/react";
import { FormInput, NButton, NForm, toast } from "najm-kit";

import { resetPasswordSchema } from "../config/authSchemas";
import { getAuthErrorMessage } from "../lib/getAuthErrorMessage";
import type { ResetPasswordFormProps, ResetPasswordValues } from "@/app/(auth)/types";
import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import { AuthCard } from "./AuthCard";

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const { t } = useKafilLanguage();
  const { isLoading, resetPassword } = useResetPassword({
    onError: (error) =>
      toast.error(getAuthErrorMessage(error, t("auth.resetLinkInvalid"))),
    onSuccess: () => {
      toast.success(t("auth.passwordSaved"));
      router.replace("/login");
    },
  });

  async function handleSubmit({ newPassword }: ResetPasswordValues) {
    await resetPassword({ token, newPassword });
  }

  return (
    <AuthCard
      title={t("auth.setPasswordTitle")}
      description={t("auth.setPasswordDescription")}
      footer={
        <Link className="font-medium text-primary hover:underline" href="/login">
          {t("auth.backToSignIn")}
        </Link>
      }
    >
      {!token ? (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {t("auth.missingToken")}
        </p>
      ) : (
        <>
          <NForm
            id="reset-password-form"
            schema={resetPasswordSchema}
            defaultValues={{ newPassword: "", confirmPassword: "" }}
            onSubmit={handleSubmit}
            className="h-auto space-y-4"
          >
            <FormInput
              name="newPassword"
              type="password"
              formLabel={t("auth.newPasswordLabel")}
              placeholder={t("auth.newPasswordPlaceholder")}
              icon="KeyRound"
              required
            />
            <FormInput
              name="confirmPassword"
              type="password"
              formLabel={t("auth.confirmPasswordLabel")}
              placeholder={t("auth.confirmPasswordPlaceholder")}
              icon="KeyRound"
              required
            />
            <NButton
              className="mt-1"
              fullWidth
              loading={isLoading}
              loadingText={t("auth.saving")}
              rounded="lg"
              size="lg"
              type="submit"
            >
              {t("auth.savePassword")}
            </NButton>
          </NForm>
        </>
      )}
    </AuthCard>
  );
}
