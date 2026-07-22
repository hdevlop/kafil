"use client";

import { Check, Copy, KeyRound, Phone } from "lucide-react";
import { NButton, toast } from "najm-kit";

export function InitialCredentialsCard({
  password,
  phone,
  onDone,
}: Readonly<{
  password: string;
  phone: string;
  onDone: () => void;
}>) {
  async function copyCredentials() {
    await navigator.clipboard.writeText(`Phone: ${phone}\nPassword: ${password}`);
    toast.success("Login details copied.");
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <div className="flex items-center gap-3">
          <Check className="size-5 text-primary" aria-hidden="true" />
          <p className="font-semibold">Account created</p>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Give these details directly to the person. The password is shown only once and is never stored as plain text.
          Ask them to change it after their first login.
        </p>
        <dl className="mt-4 space-y-3">
          <div className="flex items-center gap-3 rounded-xl bg-background px-4 py-3">
            <Phone className="size-4 text-muted-foreground" aria-hidden="true" />
            <div>
              <dt className="text-xs text-muted-foreground">Phone</dt>
              <dd className="font-mono font-semibold">{phone}</dd>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-background px-4 py-3">
            <KeyRound className="size-4 text-muted-foreground" aria-hidden="true" />
            <div>
              <dt className="text-xs text-muted-foreground">Initial password</dt>
              <dd className="break-all font-mono font-semibold">{password}</dd>
            </div>
          </div>
        </dl>
      </div>
      <div className="flex justify-end gap-3">
        <NButton type="button" variant="outline" leftIcon={Copy} onClick={() => void copyCredentials()}>
          Copy details
        </NButton>
        <NButton type="button" onClick={onDone}>Done</NButton>
      </div>
    </div>
  );
}
