"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { confirmEmailVerification } from "@/services/accessApi";

export function VerifyEmailForm({ token }: Readonly<{ token: string }>) {
  const [state, setState] = useState<"loading" | "success" | "error">(
    token ? "loading" : "error",
  );

  useEffect(() => {
    if (!token) return;
    let active = true;
    confirmEmailVerification(token)
      .then(() => active && setState("success"))
      .catch(() => active && setState("error"));
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div className="flex w-full flex-col text-center">
      <p className="text-3xl text-muted-foreground">
        {state === "loading" ? "Activating your account..." : state === "success" ? "Account activated" : "Activation link unavailable"}
      </p>
      <p className="mt-5 rounded-2xl bg-muted px-5 py-4 text-sm leading-6 text-muted-foreground">
        {state === "loading"
          ? "Please wait while Kafil verifies your email."
          : state === "success"
            ? "Your email is verified. You can now sign in."
            : "This activation link is missing, expired, or already used. Request a new one from the registration page."}
      </p>
      <Link className="mt-5 text-sm font-medium text-primary hover:underline" href={state === "success" ? "/login" : "/register/sponsor"}>
        {state === "success" ? "Continue to login" : "Return to registration"}
      </Link>
    </div>
  );
}
