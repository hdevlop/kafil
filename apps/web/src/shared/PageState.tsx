"use client";

import { Compass, ShieldOff } from "lucide-react";
import React from "react";
import {
  NEmptyState,
  NErrorState,
  NLoadingState,
  NPageLayout,
  buttonVariants,
} from "najm-kit";
import Link from "next/link";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";

export function PageLoadingState({
  label,
}: Readonly<{ label?: string }>) {
  const { t } = useKafilLanguage();
  return (
    <NPageLayout className="grid min-h-64 place-items-center">
      <NLoadingState label={label ?? t("state.loading")} spinnerSize={52} />
    </NPageLayout>
  );
}

export function PageEmptyState({
  action,
  description,
  icon,
  title,
}: Readonly<{
  action?: React.ReactNode;
  description?: string;
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>;
  title?: string;
}>) {
  const { t } = useKafilLanguage();
  const iconNode = icon ? (
    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
      {React.isValidElement(icon)
        ? icon
        : React.createElement(icon as React.ElementType, {
            className: "h-8 w-8",
          })}
    </div>
  ) : null;
  return (
    <NPageLayout className="grid min-h-64 place-items-center">
      <NEmptyState
        title={title ?? t("state.empty")}
        description={description}
        action={action}
        icon={iconNode ?? undefined}
      />
    </NPageLayout>
  );
}

export function PageErrorState({
  error,
  onRetry,
  title,
}: Readonly<{
  error?: unknown;
  onRetry?: () => void;
  title?: string;
}>) {
  const { t } = useKafilLanguage();
  const message =
    error instanceof Error ? error.message : t("state.retry");

  return (
    <NPageLayout className="grid min-h-64 place-items-center">
      <NErrorState title={title ?? t("state.error")} message={message} onRetry={onRetry} />
    </NPageLayout>
  );
}

export function PageForbiddenState() {
  const { t } = useKafilLanguage();
  return (
    <PageEmptyState
      icon={ShieldOff}
      title={t("state.forbiddenTitle")}
      description={t("state.forbiddenDescription")}
      action={
        <Link className={buttonVariants()} href="/dashboard">
          {t("state.returnDashboard")}
        </Link>
      }
    />
  );
}

export function PageNotFoundState() {
  const { t } = useKafilLanguage();
  return (
    <PageEmptyState
      icon={Compass}
      title={t("state.notFoundTitle")}
      description={t("state.notFoundDescription")}
      action={
        <Link className={buttonVariants()} href="/dashboard">
          {t("state.returnDashboard")}
        </Link>
      }
    />
  );
}
