"use client";

import Link from "next/link";
import { useForgotPassword } from "najm-auth/client/react";
import { FormInput, NButton, NForm, toast } from "najm-kit";

import { forgotPasswordSchema } from "../config/authSchemas";
import { getAuthErrorMessage } from "../lib/getAuthErrorMessage";
import type { ForgotPasswordValues } from "@/app/(auth)/types";

export function ForgotPasswordForm() {
  const { forgotPassword, isLoading, isSuccess } = useForgotPassword({
    onError: (error) =>
      toast.error(getAuthErrorMessage(error, "Password reset request failed.")),
  });

  async function handleSubmit(values: ForgotPasswordValues) {
    await forgotPassword(values);
  }

  return (
    <div className="flex flex-col w-full">
      <div className="text-center">
        <p className="mt-1 text-4xl text-muted-foreground">Forgot your password?</p>
      </div>

      {isSuccess ? (
        <p className="mt-6 rounded-2xl bg-muted px-5 py-4 text-sm leading-6 text-muted-foreground">
          If the account exists, password reset instructions have been sent.
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
            formLabel="Email address"
            placeholder="Enter your email address"
            icon="Mail"
            required
          />
          <NButton
            fullWidth
            loading={isLoading}
            loadingText="Sending..."
            rounded="lg"
            size="xl"
            type="submit"
          >
            Send reset instructions
          </NButton>
        </NForm>
      )}

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link className="cursor-pointer font-medium text-primary transition hover:text-primary/80 hover:underline" href="/login">
          Log in
        </Link>
      </p>
    </div>
  );
}
