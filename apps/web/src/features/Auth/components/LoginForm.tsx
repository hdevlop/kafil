"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, UserRoundPlus } from "lucide-react";
import { GoogleLoginButton } from "najm-auth/client/react";
import { FormInput, NButton, NForm, toast } from "najm-kit";
import { useEffect, useState } from "react";

import { loginSchema } from "../config/authSchemas";
import { getAuthErrorMessage } from "../lib/getAuthErrorMessage";
import { getPostLoginRoute } from "../lib/getPostLoginRoute";
import type { LoginFormProps, LoginValues } from "@/app/(auth)/types";
import { useTranslation } from "najm-i18n/react";
import { auth } from "@/lib/auth";

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="size-6" viewBox="0 0 24 24">
      <path d="M21.35 12.22c0-.71-.06-1.39-.18-2.04H12v3.86h5.24a4.48 4.48 0 0 1-1.94 2.94v2.51h3.14c1.84-1.69 2.91-4.18 2.91-7.27Z" fill="#4285F4" />
      <path d="M12 21.75c2.63 0 4.83-.87 6.44-2.26l-3.14-2.51c-.87.58-1.99.93-3.3.93-2.53 0-4.67-1.71-5.44-4.01H3.32v2.59A9.74 9.74 0 0 0 12 21.75Z" fill="#34A853" />
      <path d="M6.56 13.9A5.87 5.87 0 0 1 6.25 12c0-.66.11-1.29.31-1.9V7.51H3.32A9.75 9.75 0 0 0 2.25 12c0 1.61.39 3.14 1.07 4.49l3.24-2.59Z" fill="#FBBC05" />
      <path d="M12 6.09c1.43 0 2.71.49 3.72 1.45l2.78-2.78C16.83 3.2 14.63 2.25 12 2.25a9.74 9.74 0 0 0-8.68 5.26l3.24 2.59c.77-2.3 2.91-4.01 5.44-4.01Z" fill="#EA4335" />
    </svg>
  );
}

export function LoginForm({
  googleEnabled,
  oauthErrorMessage,
  redirectTo,
}: LoginFormProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (oauthErrorMessage) toast.error(oauthErrorMessage);
  }, [oauthErrorMessage]);

  async function handleSubmit(values: LoginValues) {
    setIsLoading(true);
    try {
      // Najm normalizes the identifier and the temporary CIN server-side, and
      // applies tokens only for the authenticated branch.
      const result = await auth.client.login(values);
      if (result.nextStep === "authenticated") toast.success(t("auth.loginSuccess"));
      router.replace(
        getPostLoginRoute(result.nextStep, redirectTo),
      );
    } catch (error) {
      toast.error(getAuthErrorMessage(error, t("auth.loginFailed")));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col  w-full">
      <div className="text-center">
        <p className="mt-1 text-4xl text-muted-foreground">{t("auth.welcomeBack")}</p>
      </div>

        <NForm
          id="login-form"
          schema={loginSchema}
          defaultValues={{ identifier: "", password: "", rememberMe: false }}
          onSubmit={handleSubmit}
          className="mt-6 h-auto space-y-4"
        >
          <FormInput
            name="identifier"
            type="text"
            formLabel={t("auth.identifierLabel")}
            placeholder={t("auth.identifierPlaceholder")}
            icon="Phone"
            required
          />
          <FormInput
            name="password"
            type="password"
            formLabel={t("auth.passwordLabel")}
            placeholder={t("auth.passwordPlaceholder")}
            icon="Lock"
            required
          />

          <div className="flex items-center justify-between gap-4 text-sm">
            <FormInput
              className="w-auto shrink-0"
              classNames={{ item: "w-auto shrink-0" }}
              label={t("auth.rememberMe")}
              name="rememberMe"
              type="checkbox"
              variant="ghost"
            />
            <Link className="cursor-pointer font-medium text-primary transition hover:text-primary/80 hover:underline" href="/forgot-password">
              {t("auth.forgotPasswordLink")}
            </Link>
          </div>
          <NButton
            fullWidth
            loading={isLoading}
            loadingText={t("auth.loggingIn")}
            rounded="lg"
            size="xl"
            type="submit"
          >
            {t("auth.logIn")}
          </NButton>
        </NForm>

        {googleEnabled ? (
          <>
            <div className="my-5 flex items-center gap-4 text-sm font-semibold text-muted-foreground">
              <span aria-hidden="true" className="h-px flex-1 bg-border" />
              {t("auth.or")}
              <span aria-hidden="true" className="h-px flex-1 bg-border" />
            </div>

            <GoogleLoginButton
              onError={() => toast.error(t("auth.googleStartError"))}
              returnTo={redirectTo}
            >
              <NButton
                fullWidth
                leftIcon={<GoogleMark />}
                rounded="lg"
                size="xl"
                type="button"
                variant="outline"
              >
                {t("auth.continueWithGoogle")}
              </NButton>
            </GoogleLoginButton>
          </>
        ) : null}

        <NButton
          className="mt-3"
          fullWidth
          leftIcon={UserRoundPlus}
          onClick={() => router.push("/apply")}
          rounded="lg"
          size="xl"
          type="button"
          variant="outline"
        >
          {t("auth.createAccount")}
        </NButton>

        <div className="mt-5 flex gap-4 rounded-2xl bg-muted px-5 py-4 text-sm leading-6 text-muted-foreground">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-9 shrink-0 text-primary" />
          <p>
            {t("auth.termsNotice")
              .split(/(\{terms\}|\{privacy\})/)
              .map((part, index) =>
                part === "{terms}" || part === "{privacy}" ? (
                  <span key={index} className="font-medium text-primary underline underline-offset-2">
                    {t(part === "{terms}" ? "auth.termsOfService" : "auth.privacyPolicy")}
                  </span>
                ) : (
                  part
                ),
              )}
          </p>
        </div>
    </div>
  );
}
