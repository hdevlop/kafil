"use client";

import { NButton, NForm, FormInput, toast } from "najm-kit";
import { useState } from "react";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";

import {
  applicantFormSchema,
  applicantGenderOptions,
  type ApplicantFormValues,
} from "../config/schemas";
import { submitApplicant } from "../services/api";
import type { ApplicantSubmissionResponse } from "../types";

export function ApplicantForm({
  onSubmitted,
}: Readonly<{
  onSubmitted: (result: ApplicantSubmissionResponse) => void;
}>) {
  const { language, t } = useKafilLanguage();
  const [isLoading, setIsLoading] = useState(false);
  async function handleSubmit(values: ApplicantFormValues) {
    setIsLoading(true);
    try {
      const result = await submitApplicant({
        values,
        locale: language,
      });
      onSubmitted(result);
    } catch (error) {
      toast.error(
        getApplicantErrorMessage(error, t("applicants.form.failed")),
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="text-center">
        <p className="mt-1 text-3xl text-muted-foreground">
          {t("applicants.form.title")}
        </p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {t("applicants.form.subtitle")}
        </p>
      </div>

      <NForm
        id="applicant-application-form"
        schema={applicantFormSchema}
        defaultValues={{
          name: "",
          email: "",
          phone: "",
          cin: "",
          gender: "female",
          password: "",
        }}
        onSubmit={handleSubmit}
        devTools={{
          overrides: {
            phone: "+212612345678",
            password: "KafilDev123",
            gender: "female",
          },
        }}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <FormInput
              name="name"
              type="text"
              formLabel={t("applicants.form.name")}
              placeholder={t("applicants.form.namePlaceholder")}
              icon="User"
              required
            />
          </div>
          <FormInput
            name="gender"
            type="select"
            formLabel={t("applicants.form.genderLabel")}
            items={applicantGenderOptions.map((option) => ({
              value: option.value,
              label: t(`applicants.form.gender.${option.value}`),
            }))}
            placeholder={t("applicants.form.genderPlaceholder")}
            icon="Users"
            required
          />
        </div>
        <FormInput
          name="email"
          type="text"
          formLabel={t("applicants.form.email")}
          placeholder={t("applicants.form.emailPlaceholder")}
          icon="Mail"
          required
        />
        <FormInput
          name="phone"
          type="phone"
          formLabel={t("applicants.form.phone")}
          placeholder={t("applicants.form.phonePlaceholder")}
          icon="Phone"
          required
        />
        <FormInput
          name="cin"
          type="text"
          formLabel={t("applicants.form.cin")}
          placeholder={t("applicants.form.cinPlaceholder")}
          icon="FileKey2"
          required
        />
        <FormInput
          name="password"
          type="text"
          formLabel={t("applicants.form.password")}
          placeholder={t("applicants.form.passwordPlaceholder")}
          icon="Lock"
          required
        />

        <NButton
          fullWidth
          loading={isLoading}
          loadingText={t("applicants.form.submitting")}
          rounded="lg"
          size="xl"
          type="submit"
        >
          {t("applicants.form.submit")}
        </NButton>
      </NForm>
    </div>
  );
}

function getApplicantErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null) {
    const value = error as {
      body?: { message?: string };
      response?: { data?: { message?: string } };
    };
    return value.body?.message ?? value.response?.data?.message ?? fallback;
  }
  return fallback;
}
