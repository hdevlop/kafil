"use client";

import {
  NButton,
  NEmptyState,
  NErrorState,
  NLoadingState,
  NPageLayout,
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
  title,
}: Readonly<{
  action?: React.ReactNode;
  description?: string;
  title?: string;
}>) {
  const { t } = useKafilLanguage();
  return (
    <NPageLayout className="grid min-h-64 place-items-center">
      <NEmptyState title={title ?? t("state.empty")} description={description} action={action} />
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
      title={t("state.forbiddenTitle")}
      description={t("state.forbiddenDescription")}
      action={
        <NButton asChild>
          <Link href="/dashboard">{t("state.returnDashboard")}</Link>
        </NButton>
      }
    />
  );
}

export function PageNotFoundState() {
  const { t } = useKafilLanguage();
  return (
    <PageEmptyState
      title={t("state.notFoundTitle")}
      description={t("state.notFoundDescription")}
      action={
        <NButton asChild>
          <Link href="/dashboard">{t("state.returnDashboard")}</Link>
        </NButton>
      }
    />
  );
}
