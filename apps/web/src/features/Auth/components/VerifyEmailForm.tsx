"use client";

import { FormInput, NButton, NForm, NLoadingState, toast } from "najm-kit";
import { useEffect, useMemo, useState } from "react";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import {
  cancelSponsorEmailOtp,
  confirmEmailVerification,
  getSponsorEmailOtpSetup,
  resendSponsorEmailOtp,
  type SponsorEmailOtpSetup,
} from "@/services/accessApi";
import {
  sponsorEmailOtpSchema,
  type SponsorEmailOtpValues,
} from "../config/authSchemas";
import { getAuthErrorMessage } from "../lib/getAuthErrorMessage";

export function VerifyEmailForm() {
  const { t } = useKafilLanguage();
  const [setup, setSetup] = useState<SponsorEmailOtpSetup | null>(null);
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    let active = true;
    getSponsorEmailOtpSetup()
      .then((result) => {
        if (active) setSetup(result);
      })
      .catch(() => {
        if (active) window.location.replace("/login");
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, []);

  const resendSeconds = useMemo(() => setup
    ? Math.max(0, Math.ceil((new Date(setup.resendAvailableAt).getTime() - now) / 1_000))
    : 0, [now, setup]);
  const expired = setup
    ? new Date(setup.expiresAt).getTime() <= now
    : false;

  async function submit(values: SponsorEmailOtpValues) {
    setSubmitting(true);
    try {
      await confirmEmailVerification(values.code);
      toast.success(t("access.emailOtp.success"));
      window.location.replace("/dashboard");
    } catch (error) {
      toast.error(getAuthErrorMessage(error, t("access.emailOtp.invalid")));
    } finally {
      setSubmitting(false);
    }
  }

  async function resend() {
    setSubmitting(true);
    try {
      const result = await resendSponsorEmailOtp();
      setSetup(result);
      toast.success(t("access.emailOtp.resendSuccess"));
    } catch (error) {
      toast.error(getAuthErrorMessage(error, t("access.emailOtp.invalid")));
    } finally {
      setSubmitting(false);
    }
  }

  async function cancel() {
    setSubmitting(true);
    try {
      await cancelSponsorEmailOtp();
    } finally {
      window.location.replace("/login");
    }
  }

  if (checking || !setup) {
    return <NLoadingState label={t("access.emailOtp.checking")} />;
  }

  return (
    <div className="flex w-full flex-col text-center" dir="auto">
      <h1 className="text-3xl text-muted-foreground">{t("access.emailOtp.title")}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {t("access.emailOtp.instructions")}
      </p>
      <p className="mt-2 font-medium" aria-label={t("access.emailOtp.destination")}>
        {setup.maskedDestination}
      </p>
      {!setup.emailSent ? (
        <p className="mt-4 rounded-lg bg-warning/10 px-4 py-3 text-sm text-warning-foreground" role="status">
          {t("access.emailOtp.deliveryFailed")}
        </p>
      ) : null}
      <p className="mt-3 text-xs text-muted-foreground" role="status">
        {expired ? t("access.emailOtp.expired") : t("access.emailOtp.expiresMinutes")}
      </p>

      <NForm
        id="sponsor-email-otp-form"
        schema={sponsorEmailOtpSchema}
        defaultValues={{ code: "" }}
        onSubmit={submit}
        className="mt-6 space-y-5 text-start"
      >
        <FormInput
          name="code"
          type="otp"
          formLabel={t("access.emailOtp.codeLabel")}
          formDescription={t("access.emailOtp.codeDescription")}
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
          loadingText={t("access.emailOtp.submitting")}
          disabled={expired}
        >
          {t("access.emailOtp.submit")}
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
            ? t("access.emailOtp.resendIn", { seconds: resendSeconds })
            : t("access.emailOtp.resend")}
        </NButton>
        <NButton
          type="button"
          variant="ghost"
          disabled={submitting}
          onClick={() => void cancel()}
        >
          {t("access.emailOtp.cancel")}
        </NButton>
      </div>
    </div>
  );
}
