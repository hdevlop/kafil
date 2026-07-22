import Link from "next/link";

import type { AuthCardProps } from "@/app/(auth)/types";

export function AuthCard({
  children,
  description,
  footer,
  title,
}: AuthCardProps) {
  return (
    <section className="mx-auto w-full max-w-md rounded-3xl border border-border bg-card p-7 text-card-foreground shadow-xl shadow-foreground/5 sm:p-9">
      <Link className="text-sm font-semibold text-primary" href="/">
        Kafil
      </Link>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 leading-6 text-muted-foreground">{description}</p>
      <div className="mt-7">{children}</div>
      {footer ? (
        <div className="mt-6 border-t border-border pt-5 text-sm text-muted-foreground">
          {footer}
        </div>
      ) : null}
    </section>
  );
}
