"use client";

import { FormInput, NButton, NForm, NLoadingState, toast } from "najm-kit";
import { useEffect, useMemo, useState } from "react";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";

import {
  applicantEmailOtpSchema,
  type ApplicantEmailOtpValues,
} from "../config/schemas";
import {
  confirmApplicantEmailOtp,
  getApplicantEmailOtpSetup,
  resendApplicantEmailOtp,
} from "../services/api";
import type { ApplicantEmailOtpSetup } from "../types";

export function OtpStep({
  setup,
  onVerified,
}: Readonly<{
  setup: ApplicantEmailOtpSetup;
  onVerified: (destination: string) => void;
}>) {
  const { t } = useKafilLanguage();
  const [current, setCurrent] = useState<ApplicantEmailOtpSetup>(setup);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const initial = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, []);

  const resendSeconds = useMemo(
    () =>
      Math.max(
        0,
        Math.ceil(
          (new Date(current.resendAvailableAt).getTime() - now) / 1_000,
        ),
      ),
    [current.resendAvailableAt, now],
  );
  const expired = new Date(current.expiresAt).getTime() <= now;

  async function refreshSetup() {
    setChecking(true);
    try {
      const next = await getApplicantEmailOtpSetup();
      setCurrent(next);
    } catch {
      /* the setup endpoint may 404 if the setup session is gone */
    } finally {
      setChecking(false);
    }
  }

  async function submit(values: ApplicantEmailOtpValues) {
    setSubmitting(true);
    try {
      await confirmApplicantEmailOtp(values.code);
      toast.success(t("applicants.otp.success"));
      onVerified(current.maskedDestination);
    } catch (error) {
      toast.error(
        getOtpErrorMessage(error, t("applicants.otp.invalid")),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function resend() {
    setSubmitting(true);
    try {
      const next = await resendApplicantEmailOtp();
      setCurrent({
        nextStep: next.nextStep,
        expiresAt: next.expiresAt,
        resendAvailableAt: next.resendAvailableAt,
        maskedDestination: next.maskedDestination,
        emailSent: next.emailSent,
      });
      toast.success(t("applicants.otp.resendSuccess"));
    } catch (error) {
      toast.error(
        getOtpErrorMessage(error, t("applicants.otp.invalid")),
      );
    } finally {
      setSubmitting(false);
    }
  }

  function cancel() {
    window.location.assign("/");
  }

  if (checking) {
    return <NLoadingState label={t("applicants.otp.checking")} />;
  }

  return (
    <div className="flex w-full flex-col text-center" dir="auto">
      <h1 className="text-3xl text-muted-foreground">
        {t("applicants.otp.title")}
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {t("applicants.otp.instructions")}
      </p>
      <p
        className="mt-2 font-medium"
        aria-label={t("applicants.otp.destination")}
      >
        {current.maskedDestination}
      </p>
      {!current.emailSent ? (
        <p
          className="mt-4 rounded-lg bg-warning/10 px-4 py-3 text-sm text-warning-foreground"
          role="status"
        >
          {t("applicants.otp.deliveryFailed")}
        </p>
      ) : null}
      <p className="mt-3 text-xs text-muted-foreground" role="status">
        {expired
          ? t("applicants.otp.expired")
          : t("applicants.otp.expiresMinutes")}
      </p>

      <NForm
        id="applicant-email-otp-form"
        schema={applicantEmailOtpSchema}
        defaultValues={{ code: "" }}
        onSubmit={submit}
        className="mt-6 space-y-5 text-start"
      >
        <FormInput
          name="code"
          type="otp"
          formLabel={t("applicants.otp.codeLabel")}
          formDescription={t("applicants.otp.codeDescription")}
          length={6}
          numeric
          autoComplete="one-time-code"
          disabled={submitting}
          required
        />
        <NButton
          fullWidth
          type="submit"
          size="xl"
          rounded="lg"
          loading={submitting}
          loadingText={t("applicants.otp.submitting")}
          disabled={expired}
        >
          {t("applicants.otp.submit")}
        </NButton>
      </NForm>

      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <NButton
          type="button"
          variant="outline"
          disabled={submitting || resendSeconds > 0}
          onClick={() => void resend()}
        >
          {resendSeconds > 0
            ? t("applicants.otp.resendIn", { seconds: resendSeconds })
            : t("applicants.otp.resend")}
        </NButton>
        <NButton
          type="button"
          variant="ghost"
          disabled={submitting}
          onClick={() => {
            cancel();
          }}
        >
          {t("applicants.otp.cancel")}
        </NButton>
      </div>

      <div className="sr-only" aria-live="polite">
        {expired ? t("applicants.otp.expired") : ""}
      </div>
      <button
        type="button"
        className="sr-only"
        onClick={() => void refreshSetup()}
      >
        {t("applicants.otp.refresh")}
      </button>
    </div>
  );
}

function getOtpErrorMessage(error: unknown, fallback: string) {
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
