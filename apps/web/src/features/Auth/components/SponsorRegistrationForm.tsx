"use client";

import Link from "next/link";
import { FormInput, NButton, NForm, toast } from "najm-kit";
import { useState } from "react";

import { useDevFormTools } from "@/lib/devFormFill";
import { sponsorRegistrationSchema } from "../config/authSchemas";
import { getAuthErrorMessage } from "../lib/getAuthErrorMessage";
import type { RegistrationValues } from "@/app/(auth)/types";
import {
  registerSponsorAccess,
} from "@/services/accessApi";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";

export function SponsorRegistrationForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const { language, t } = useKafilLanguage();
  const devTools = useDevFormTools(sponsorRegistrationSchema, {
    password: "KafilDev123",
    confirmPassword: "KafilDev123",
  });

  async function handleSubmit(values: RegistrationValues) {
    setIsLoading(true);
    try {
      const result = await registerSponsorAccess({
        name: values.name,
        email: values.email,
        password: values.password,
        locale: language,
      });
      setRegisteredEmail(values.email);
      setEmailSent(result.emailSent);
    } catch (error) {
      toast.error(getAuthErrorMessage(error, t("access.registration.failed")));
    } finally {
      setIsLoading(false);
    }
  }

  if (registeredEmail) {
    return (
      <div className="flex w-full flex-col text-center">
        <p className="text-3xl text-muted-foreground">{t("access.registration.checkEmail")}</p>
        <p className="mt-5 rounded-2xl bg-muted px-5 py-4 text-sm leading-6 text-muted-foreground">
          {emailSent
            ? t("access.registration.sent", { email: registeredEmail })
            : t("access.registration.notSent")}
        </p>
        <Link className="mt-5 text-sm font-medium text-primary hover:underline" href="/login">
          {t("access.registration.activate")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full">
      <div className="text-center">
        <p className="mt-1 text-4xl text-muted-foreground">{t("access.registration.title")}</p>
      </div>

      <NForm
        id="sponsor-registration-form"
        schema={sponsorRegistrationSchema}
        defaultValues={{
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
        }}
        onSubmit={handleSubmit}
        devTools={devTools}
        className="mt-6 h-auto space-y-4"
      >
        <FormInput
          name="name"
          type="text"
          formLabel={t("access.registration.name")}
          placeholder={t("access.registration.namePlaceholder")}
          icon="User"
          required
        />
        <FormInput
          name="email"
          type="text"
          formLabel={t("access.registration.email")}
          placeholder={t("access.registration.emailPlaceholder")}
          icon="Mail"
          required
        />
        <FormInput
          name="password"
          type="password"
          formLabel={t("access.registration.password")}
          placeholder={t("access.registration.passwordPlaceholder")}
          icon="Lock"
          required
        />
        <FormInput
          name="confirmPassword"
          type="password"
          formLabel={t("access.registration.confirmPassword")}
          placeholder={t("access.registration.confirmPasswordPlaceholder")}
          icon="Lock"
          required
        />

        <NButton
          fullWidth
          loading={isLoading}
          loadingText={t("access.registration.submitting")}
          rounded="lg"
          size="xl"
          type="submit"
        >
          {t("access.registration.submit")}
        </NButton>
      </NForm>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        {t("access.registration.already")} {" "}
        <Link className="cursor-pointer font-medium text-primary transition hover:text-primary/80 hover:underline" href="/login">
          {t("access.registration.login")}
        </Link>
      </p>
    </div>
  );
}
