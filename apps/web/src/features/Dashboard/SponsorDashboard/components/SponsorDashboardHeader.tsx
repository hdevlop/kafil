"use client";

import { LayoutDashboard } from "lucide-react";
import { NPageHeader, NPageHeaderActions } from "najm-kit";

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
