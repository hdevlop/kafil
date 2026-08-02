"use client";

import { LayoutDashboard } from "lucide-react";
import { NPageHeaderActions } from "najm-kit";

import { DashboardPageHeader as NPageHeader } from "@/shared/DashboardShell/DashboardPageHeader";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";

export function SponsorDashboardHeader({
  title,
  subtitle,
}: Readonly<{
  title: string;
  subtitle: string;
}>) {
  return (
    <NPageHeader
      icon={LayoutDashboard}
      title={title}
      subtitle={subtitle}
    >
      <NPageHeaderActions>
        <PageHeaderGlobalActions />
      </NPageHeaderActions>
    </NPageHeader>
  );
}
