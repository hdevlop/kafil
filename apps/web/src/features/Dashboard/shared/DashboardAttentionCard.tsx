"use client";

import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { NCard, useNajmFormat } from "najm-kit";

export interface DashboardAttentionItem {
  href?: string;
  icon: LucideIcon;
  id: string;
  label: string;
  tone: string;
  value: number;
}

function AttentionRow({
  allClearLabel,
  item,
}: Readonly<{
  allClearLabel: string;
  item: DashboardAttentionItem;
}>) {
  const fmt = useNajmFormat();
  const Icon = item.icon;
  const isEmpty = item.value === 0;
  const content = (
    <>
      <span className="flex min-w-0 items-center gap-2.5">
        <span className={`size-2 shrink-0 rounded-full ${item.tone}`} />
        <Icon
          aria-hidden="true"
          className={`size-4 shrink-0 ${isEmpty ? "text-muted-foreground/60" : "text-muted-foreground"}`}
        />
        <span className={`truncate text-sm ${isEmpty ? "text-muted-foreground" : ""}`}>
          {item.label}
        </span>
      </span>
      {isEmpty ? (
        <Check
          aria-hidden="true"
          aria-label={allClearLabel}
          className="size-4 shrink-0 text-emerald-500"
        />
      ) : (
        <strong className="shrink-0 text-sm tabular-nums">{fmt.number(item.value)}</strong>
      )}
    </>
  );
  const className = "flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0";

  return item.href ? (
    <Link className={`${className} hover:text-primary`} href={item.href}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

export function DashboardAttentionCard({
  allClearLabel,
  children,
  icon,
  items,
  title,
}: Readonly<{
  allClearLabel: string;
  children?: ReactNode;
  icon: LucideIcon;
  items: DashboardAttentionItem[];
  title: string;
}>) {
  return (
    <NCard className="h-full" icon={icon} title={title}>
      <div className="divide-y divide-border/70">
        {items.map((item) => (
          <AttentionRow allClearLabel={allClearLabel} item={item} key={item.id} />
        ))}
      </div>
      {children}
    </NCard>
  );
}
