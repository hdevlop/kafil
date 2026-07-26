"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  normalizeKafilTimeZone,
  type KafilTimeZone,
} from "@/lib/format";

interface TimeZonePreferenceContextValue {
  timeZone: KafilTimeZone;
  setTimeZone: (timeZone: KafilTimeZone) => Promise<void>;
}

const TimeZonePreferenceContext = createContext<TimeZonePreferenceContextValue | null>(null);

export function TimeZonePreferenceProvider({
  children,
  initialTimeZone,
}: Readonly<{
  children: React.ReactNode;
  initialTimeZone: KafilTimeZone;
}>) {
  const [timeZone, setTimeZoneState] = useState<KafilTimeZone>(initialTimeZone);
  const router = useRouter();

  const setTimeZone = useCallback(
    async (nextTimeZone: KafilTimeZone) => {
      const normalized = normalizeKafilTimeZone(nextTimeZone);
      if (normalized === timeZone) return;

      const response = await fetch("/api/ui-timezone", {
        body: JSON.stringify({ timeZone: normalized }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });

      if (!response.ok) throw new Error("Could not update time zone preference.");

      document.documentElement.dataset.timeZone = normalized;
      setTimeZoneState(normalized);
      router.refresh();
    },
    [router, timeZone],
  );

  const value = useMemo<TimeZonePreferenceContextValue>(
    () => ({ timeZone, setTimeZone }),
    [setTimeZone, timeZone],
  );

  return (
    <TimeZonePreferenceContext.Provider value={value}>
      {children}
    </TimeZonePreferenceContext.Provider>
  );
}

export function useKafilTimeZone() {
  const context = useContext(TimeZonePreferenceContext);
  if (!context) {
    throw new Error("useKafilTimeZone must be used within TimeZonePreferenceProvider.");
  }
  return context;
}
