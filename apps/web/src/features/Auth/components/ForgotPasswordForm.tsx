"use client";

import Link from "next/link";
import { useForgotPassword } from "najm-auth/client/react";
import { FormInput, NButton, NForm, toast } from "najm-kit";

import { forgotPasswordSchema } from "../config/authSchemas";
import { getAuthErrorMessage } from "../lib/getAuthErrorMessage";
import type { ForgotPasswordValues } from "@/app/(auth)/types";
import { useKafilLanguage } from "@/i18n/useKafilLanguage";

export function ForgotPasswordForm() {
  const { t } = useKafilLanguage();
  const { forgotPassword, isLoading, isSuccess } = useForgotPassword({
    onError: (error) =>
      toast.error(getAuthErrorMessage(error, t("auth.resetRequestFailed"))),
  });

  async function handleSubmit(values: ForgotPasswordValues) {
    await forgotPassword(values);
  }

  return (
    <div className="flex flex-col w-full">
      <div className="text-center">
        <p className="mt-1 text-4xl text-muted-foreground">{t("auth.forgotTitle")}</p>
      </div>

      {isSuccess ? (
        <p className="mt-6 rounded-2xl bg-muted px-5 py-4 text-sm leading-6 text-muted-foreground">
          {t("auth.forgotSent")}
        </p>
      ) : (
        <NForm
          id="forgot-password-form"
          schema={forgotPasswordSchema}
          defaultValues={{ email: "" }}
          onSubmit={handleSubmit}
          className="mt-6 h-auto space-y-4"
        >
          <FormInput
            name="email"
            type="text"
            formLabel={t("auth.emailLabel")}
            placeholder={t("auth.emailPlaceholder")}
            icon="Mail"
            required
          />
          <NButton
            fullWidth
            loading={isLoading}
            loadingText={t("auth.sending")}
            rounded="lg"
            size="xl"
            type="submit"
          >
            {t("auth.sendResetInstructions")}
          </NButton>
        </NForm>
      )}

      <p className="mt-5 text-center text-sm text-muted-foreground">
        {t("auth.rememberPassword")}{" "}
        <Link className="cursor-pointer font-medium text-primary transition hover:text-primary/80 hover:underline" href="/login">
          {t("auth.logIn")}
        </Link>
      </p>
    </div>
  );
}
