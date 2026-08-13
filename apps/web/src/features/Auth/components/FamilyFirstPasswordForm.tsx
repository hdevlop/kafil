"use client";

import { KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { FormInput, NButton, NForm, toast } from "najm-kit";
import { useEffect, useState } from "react";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import {
  cancelCredentialSetup,
  getCredentialSetupStatus,
  replaceCredentialSetupPassword,
} from "@/services/credentialSetupApi";
import {
  familyFirstPasswordSchema,
  type FamilyFirstPasswordValues,
} from "../config/authSchemas";
import { getAuthErrorMessage } from "../lib/getAuthErrorMessage";

export function FamilyFirstPasswordForm() {
  const { t } = useKafilLanguage();
  const [checking, setChecking] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    void getCredentialSetupStatus()
      .then(({ setupRequired }) => {
        if (!active) return;
        if (setupRequired) setChecking(false);
      })
      .catch(() => {
        if (active) window.location.replace("/login");
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(values: FamilyFirstPasswordValues) {
    setIsLoading(true);
    try {
      await replaceCredentialSetupPassword({
        newPassword: values.newPassword,
      });
      toast.success(t("access.firstLogin.changed"));
      window.location.replace("/login");
    } catch (error) {
      toast.error(
        getAuthErrorMessage(error, t("access.firstLogin.changeFailed")),
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    await cancelCredentialSetup().catch(() => undefined);
    window.location.replace("/login");
  }

  if (checking) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        {t("access.firstLogin.checking")}
      </p>
    );
  }

  return (
    <section className="w-full max-w-lg rounded-3xl border bg-card p-6 shadow-xl sm:p-9">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <KeyRound aria-hidden="true" className="size-7" />
      </div>
      <h1 className="mt-5 text-center text-3xl font-semibold">
        {t("access.firstLogin.title")}
      </h1>

      <NForm
        className="mt-7"
        defaultValues={{
          newPassword: "",
          confirmPassword: "",
        }}
        id="family-first-password-form"
        onSubmit={handleSubmit}
        schema={familyFirstPasswordSchema}
      >
        <FormInput
          formDescription={t("access.firstLogin.passwordHelp")}
          formLabel={t("access.firstLogin.newPassword")}
          icon="KeyRound"
          name="newPassword"
          required
          type="password"
        />
        <FormInput
          formLabel={t("access.firstLogin.confirmPassword")}
          icon="KeyRound"
          name="confirmPassword"
          required
          type="password"
        />
        <NButton
          disabled={isSigningOut}
          fullWidth
          loading={isLoading}
          loadingText={t("access.firstLogin.saving")}
          size="xl"
          type="submit"
        >
          {t("access.firstLogin.save")}
        </NButton>
      </NForm>

      <NButton
        className="mt-3"
        disabled={isLoading}
        fullWidth
        leftIcon={LogOut}
        loading={isSigningOut}
        onClick={handleSignOut}
        type="button"
        variant="outline"
      >
        {t("action.signOut")}
      </NButton>

      <div className="mt-6 flex gap-3 rounded-2xl bg-primary/5 p-4 text-sm leading-6 text-muted-foreground">
        <ShieldCheck aria-hidden="true" className="mt-1 size-5 shrink-0 text-primary" />
        <p>{t("access.firstLogin.signInAgain")}</p>
      </div>
    </section>
  );
}
