"use client";

import Link from "next/link";
import { OAuthCallback } from "najm-auth/client/react";
import { NButton, NSpinner } from "najm-kit";

export default function GoogleOAuthCallbackPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <OAuthCallback
        defaultRedirect="/dashboard"
        errorFallback={
          <section className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
            <h1 className="text-2xl font-semibold">Google sign-in failed</h1>
            <p className="mt-3 text-muted-foreground">
              We could not finish signing you in. Please return to the login page and try again.
            </p>
            <NButton asChild className="mt-6" fullWidth rounded="lg" size="xl">
              <Link href="/login">Back to login</Link>
            </NButton>
          </section>
        }
        fallback={
          <div className="flex items-center gap-3 text-muted-foreground" role="status">
            <NSpinner />
            Completing Google sign-in...
          </div>
        }
      />
    </main>
  );
}
