"use client";

import Link from "next/link";
import { FormInput, NButton, NForm, toast } from "najm-kit";
import { useState } from "react";

import { devFormTools } from "@/lib/devFormFill";
import { sponsorRegistrationSchema } from "../config/authSchemas";
import { getAuthErrorMessage } from "../lib/getAuthErrorMessage";
import type { RegistrationValues } from "@/app/(auth)/types";
import {
  registerSponsorAccess,
  requestEmailVerification,
} from "@/services/accessApi";

export function SponsorRegistrationForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  async function handleSubmit(values: RegistrationValues) {
    setIsLoading(true);
    try {
      const result = await registerSponsorAccess({
        name: values.name,
        email: values.email,
        password: values.password,
      });
      setRegisteredEmail(values.email);
      setEmailSent(result.emailSent);
    } catch (error) {
      toast.error(getAuthErrorMessage(error, "Registration failed."));
    } finally {
      setIsLoading(false);
    }
  }

  async function resendVerification() {
    if (!registeredEmail) return;
    setIsLoading(true);
    try {
      await requestEmailVerification(registeredEmail);
      setEmailSent(true);
      toast.success("A new verification email was requested.");
    } catch (error) {
      toast.error(getAuthErrorMessage(error, "Could not request another email."));
    } finally {
      setIsLoading(false);
    }
  }

  if (registeredEmail) {
    return (
      <div className="flex w-full flex-col text-center">
        <p className="text-3xl text-muted-foreground">Check your email</p>
        <p className="mt-5 rounded-2xl bg-muted px-5 py-4 text-sm leading-6 text-muted-foreground">
          {emailSent
            ? `We sent an activation link to ${registeredEmail}. Open it before signing in.`
            : "Your account is pending, but the email could not be delivered. Request another activation email below."}
        </p>
        <NButton className="mt-5" type="button" variant="outline" loading={isLoading} onClick={() => void resendVerification()}>
          Send activation email again
        </NButton>
        <Link className="mt-5 text-sm font-medium text-primary hover:underline" href="/login">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full">
      <div className="text-center">
        <p className="mt-1 text-4xl text-muted-foreground">Create your account</p>
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
        devTools={devFormTools(sponsorRegistrationSchema, {
          password: "KafilDev123",
          confirmPassword: "KafilDev123",
        })}
        className="mt-6 h-auto space-y-4"
      >
        <FormInput
          name="name"
          type="text"
          formLabel="Full name"
          placeholder="Enter your full name"
          icon="User"
          required
        />
        <FormInput
          name="email"
          type="text"
          formLabel="Email address"
          placeholder="Enter your email address"
          icon="Mail"
          required
        />
        <FormInput
          name="password"
          type="password"
          formLabel="Password"
          placeholder="At least 8 characters"
          icon="Lock"
          required
        />
        <FormInput
          name="confirmPassword"
          type="password"
          formLabel="Confirm password"
          placeholder="Repeat your password"
          icon="Lock"
          required
        />

        <NButton
          fullWidth
          loading={isLoading}
          loadingText="Creating account..."
          rounded="lg"
          size="xl"
          type="submit"
        >
          Create account and verify email
        </NButton>
      </NForm>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link className="cursor-pointer font-medium text-primary transition hover:text-primary/80 hover:underline" href="/login">
          Log in
        </Link>
      </p>
    </div>
  );
}
