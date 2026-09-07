"use client";

import { ArrowRight, Headset } from "lucide-react";
import { NButton, NCard, useNSidebar } from "najm-kit";
import Link from "next/link";
import { useTranslation } from "najm-i18n/react";

export function SidebarSupportCard({ collapsed }: Readonly<{ collapsed: boolean }>) {
   const { t } = useTranslation();
   const sidebar = useNSidebar();

   if (collapsed) return null;

   return (
      <NCard
         description={t("sidebar.supportDescription")}
         icon={Headset}
         title={t("sidebar.supportTitle")}
      >
         {/* Placeholder destination until Kafil defines a support channel. */}
         <NButton asChild className="h-auto p-0" variant="link">
            <Link href="/dashboard" onClick={() => sidebar?.closeMobile()}>
               {t("sidebar.contactSupport")}
               <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
            </Link>
         </NButton>
      </NCard>
   );
}
