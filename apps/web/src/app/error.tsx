"use client";

import { NErrorState } from "najm-kit";
import { useEffect } from "react";

import { useTranslation } from "najm-i18n/react";

export default function GlobalError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  const { t } = useTranslation();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <NErrorState
      message={t("state.retry")}
      onRetry={reset}
      surface="page"
    />
  );
}
