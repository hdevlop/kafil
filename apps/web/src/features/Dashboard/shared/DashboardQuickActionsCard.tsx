"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowRight, Zap } from "lucide-react";
import Link from "next/link";
import { NButton, NCard } from "najm-kit";

export interface DashboardQuickAction {
  description: string;
  disabled?: boolean;
  href?: string;
  icon: LucideIcon;
  id: string;
  label: string;
  onClick?: () => void;
}

function ActionContent({ action }: Readonly<{ action: DashboardQuickAction }>) {
  const Icon = action.icon;

  return (
    <>
      <span className="flex items-center justify-center rounded-xl bg-primary/10 p-2">
        <Icon aria-hidden="true" className="size-5 shrink-0 text-primary" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{action.label}</span>
        <span className="block truncate text-xs font-normal text-muted-foreground">
          {action.description}
        </span>
      </span>
      <ArrowRight aria-hidden="true" className="size-4 shrink-0 rtl:rotate-180" />
    </>
  );
}

export function DashboardQuickActionsCard({
  actions,
  title,
}: Readonly<{
  actions: DashboardQuickAction[];
  title: string;
}>) {
  return (
    <NCard className="h-full" icon={Zap} title={title}>
      <div className="space-y-2">
        {actions.map((action) =>
          action.href && !action.disabled ? (
            <NButton
              asChild
              className="h-auto min-h-14 w-full justify-start px-3 py-2 text-start"
              key={action.id}
              variant="outline"
            >
              <Link href={action.href}>
                <ActionContent action={action} />
              </Link>
            </NButton>
          ) : (
            <NButton
              className="h-auto min-h-14 w-full justify-start px-3 py-2 text-start"
              disabled={action.disabled}
              key={action.id}
              onClick={action.onClick}
              type="button"
              variant="outline"
            >
              <ActionContent action={action} />
            </NButton>
          ),
        )}
      </div>
    </NCard>
  );
}
