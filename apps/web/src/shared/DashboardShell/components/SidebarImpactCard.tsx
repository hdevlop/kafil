"use client";

import { HeartHandshake } from "lucide-react";
import { NButton, NCard, useNajmFormat, useNSidebar } from "najm-kit";
import Link from "next/link";
import { useTranslation } from "najm-i18n/react";

import { useSponsorDashboard } from "@/features/Dashboard/SponsorDashboard/hooks/useSponsorDashboard";

export function SidebarImpactCard({ collapsed }: Readonly<{ collapsed: boolean }>) {
   const { t } = useTranslation();
   const fmt = useNajmFormat();
   const sidebar = useNSidebar();
   const dashboard = useSponsorDashboard();

   if (collapsed) return null;
   if (dashboard.isError) return null;
   if (dashboard.isPending || !dashboard.data) {
      return (
         <NCard
            icon={HeartHandshake}
            loading
            loadingText={t("state.loading")}
            title={t("sidebar.impactTitle")}
         />
      );
   }

   return (
      <NCard
         description={t("sidebar.impactDescription", {
            count: fmt.number(dashboard.data.counts.activeSupportedFamilies),
         })}
         icon={HeartHandshake}
         title={t("sidebar.impactTitle")}
      >
         <NButton asChild fullWidth size="sm">
            <Link href="/family" onClick={() => sidebar?.closeMobile()}>
               {t("sidebar.sponsorMore")}
            </Link>
         </NButton>
      </NCard>
   );
}
