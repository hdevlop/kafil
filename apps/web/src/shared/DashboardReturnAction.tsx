"use client";

import { buttonVariants } from "najm-kit";
import Link from "next/link";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";

/** Kafil-owned localized navigation for generic route feedback states. */
export function DashboardReturnAction() {
  const { t } = useKafilLanguage();

  return (
    <Link className={buttonVariants()} href="/dashboard">
      {t("state.returnDashboard")}
    </Link>
  );
}
