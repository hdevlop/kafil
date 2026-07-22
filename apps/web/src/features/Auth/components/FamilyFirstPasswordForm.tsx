"use client";

import { KeyRound, ShieldCheck } from "lucide-react";
import { FormInput, NButton, NForm, toast } from "najm-kit";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { auth } from "@/lib/auth";
import {
  changeFamilyFirstPassword,
  getFamilyPasswordRequirement,
} from "@/services/accessApi";
import {
  familyFirstPasswordSchema,
  type FamilyFirstPasswordValues,
} from "../config/authSchemas";
import { getAuthErrorMessage } from "../lib/getAuthErrorMessage";

export function FamilyFirstPasswordForm() {
  const router = useRouter();
  const { t } = useKafilLanguage();
  const [checking, setChecking] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    void getFamilyPasswordRequirement()
      .then(({ mustChangePassword }) => {
        if (!active) return;
        if (!mustChangePassword) {
          router.replace("/family");
          return;
        }
        setChecking(false);
      })
      .catch(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [router]);

  async function handleSubmit(values: FamilyFirstPasswordValues) {
    setIsLoading(true);
    try {
      await changeFamilyFirstPassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      await auth.client.logout().catch(() => undefined);
      toast.success(t("access.firstLogin.changed"));
      router.replace("/login");
      router.refresh();
    } catch (error) {
      toast.error(
        getAuthErrorMessage(error, t("access.firstLogin.changeFailed")),
      );
    } finally {
      setIsLoading(false);
    }
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
      <p className="mt-3 text-center leading-7 text-muted-foreground">
        {t("access.firstLogin.description")}
      </p>

      <NForm
        className="mt-7 space-y-5"
        defaultValues={{
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        }}
        id="family-first-password-form"
        onSubmit={handleSubmit}
        schema={familyFirstPasswordSchema}
      >
        <FormInput
          formLabel={t("access.firstLogin.currentPassword")}
          icon="Lock"
          name="currentPassword"
          required
          type="password"
        />
        <FormInput
          formLabel={t("access.firstLogin.newPassword")}
          icon="KeyRound"
          name="newPassword"
          required
          type="password"
        />
        <p className="rounded-xl bg-muted px-4 py-3 text-sm leading-6 text-muted-foreground">
          {t("access.firstLogin.passwordHelp")}
        </p>
        <FormInput
          formLabel={t("access.firstLogin.confirmPassword")}
          icon="KeyRound"
          name="confirmPassword"
          required
          type="password"
        />
        <NButton
          fullWidth
          loading={isLoading}
          loadingText={t("access.firstLogin.saving")}
          size="xl"
          type="submit"
        >
          {t("access.firstLogin.save")}
        </NButton>
      </NForm>

      <div className="mt-6 flex gap-3 rounded-2xl bg-primary/5 p-4 text-sm leading-6 text-muted-foreground">
        <ShieldCheck aria-hidden="true" className="mt-1 size-5 shrink-0 text-primary" />
        <p>{t("access.firstLogin.signInAgain")}</p>
      </div>
    </section>
  );
}
