"use client";

import { NErrorState } from "najm-kit";
import { useEffect } from "react";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";

export default function GlobalError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  const { t } = useKafilLanguage();

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
