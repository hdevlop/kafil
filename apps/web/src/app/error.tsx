"use client";

import { PageErrorState } from "@/shared/PageState";

export default function GlobalError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return <PageErrorState error={error} onRetry={reset} />;
}
