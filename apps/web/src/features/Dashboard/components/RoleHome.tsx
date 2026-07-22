"use client";

import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { DashboardPageHeader as NPageHeader } from "@/shared/DashboardShell/DashboardPageHeader";

function DashboardIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function RoleHome({
  description,
  items,
  title,
}: Readonly<{
  description: string;
  items: Array<{ label: string; detail: string }>;
  title: string;
}>) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <NPageHeader icon={DashboardIcon} title={title} subtitle={description} actions={<PageHeaderGlobalActions />} />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <article
            className="rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm"
            key={item.label}
          >
            <h2 className="font-semibold">{item.label}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {item.detail}
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
