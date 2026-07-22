"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useResetPassword } from "najm-auth/client/react";
import { FormInput, NButton, NForm, toast } from "najm-kit";

import { resetPasswordSchema } from "../config/authSchemas";
import { getAuthErrorMessage } from "../lib/getAuthErrorMessage";
import type { ResetPasswordFormProps, ResetPasswordValues } from "@/app/(auth)/types";
import { AuthCard } from "./AuthCard";

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const { isLoading, resetPassword } = useResetPassword({
    onError: (error) =>
      toast.error(getAuthErrorMessage(error, "The reset link is invalid or expired.")),
    onSuccess: () => {
      toast.success("Password saved. You can now sign in.");
      router.replace("/login");
    },
  });

  async function handleSubmit({ newPassword }: ResetPasswordValues) {
    await resetPassword({ token, newPassword });
  }

  return (
    <AuthCard
      title="Set your password"
      description="This page supports password resets and operator-created account invitations."
      footer={
        <Link className="font-medium text-primary hover:underline" href="/login">
          Back to sign in
        </Link>
      }
    >
      {!token ? (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          This password link is missing its token.
        </p>
      ) : (
        <>
          <NForm
            id="reset-password-form"
            schema={resetPasswordSchema}
            defaultValues={{ newPassword: "", confirmPassword: "" }}
            onSubmit={handleSubmit}
            className="h-auto space-y-4"
          >
            <FormInput
              name="newPassword"
              type="password"
              formLabel="New password"
              placeholder="At least 8 characters"
              icon="KeyRound"
              required
            />
            <FormInput
              name="confirmPassword"
              type="password"
              formLabel="Confirm password"
              placeholder="Repeat the new password"
              icon="KeyRound"
              required
            />
          </NForm>
          <NButton
            className="mt-5"
            form="reset-password-form"
            fullWidth
            loading={isLoading}
            loadingText="Saving..."
            rounded="lg"
            size="lg"
            type="submit"
          >
            Save password
          </NButton>
        </>
      )}
    </AuthCard>
  );
}
