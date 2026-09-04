"use client";

import { buttonVariants } from "najm-kit";
import Link from "next/link";

import { useTranslation } from "najm-i18n/react";

/** Kafil-owned localized navigation for generic route feedback states. */
export function DashboardReturnAction() {
  const { t } = useTranslation();

  return (
    <Link className={buttonVariants()} href="/dashboard">
      {t("state.returnDashboard")}
    </Link>
  );
}
