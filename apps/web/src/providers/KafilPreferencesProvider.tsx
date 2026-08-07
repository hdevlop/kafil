"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { normalizeKafilTimeZone, type KafilTheme, type KafilTimeZone } from "@/lib/format";

interface KafilPreferencesContextValue {
  theme: KafilTheme;
  timeZone: KafilTimeZone;
  setTheme: (theme: KafilTheme) => Promise<void>;
  setTimeZone: (timeZone: KafilTimeZone) => Promise<void>;
}

const KafilPreferencesContext = createContext<KafilPreferencesContextValue | null>(null);

async function persistPreference(endpoint: string, body: object, message: string) {
  const response = await fetch(endpoint, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });

  if (!response.ok) throw new Error(message);
}

/**
 * Cookie-backed UI preferences that the server re-reads on the next render.
 * Both setters end in `router.refresh()` because the layout resolves them from
 * cookies; language is deliberately not here, since najm-i18n swaps catalogs
 * reactively and must not refresh.
 */
export function KafilPreferencesProvider({
  children,
  initialTheme,
  initialTimeZone,
}: Readonly<{
  children: React.ReactNode;
  initialTheme: KafilTheme;
  initialTimeZone: KafilTimeZone;
}>) {
  const [theme, setThemeState] = useState(initialTheme);
  const [timeZone, setTimeZoneState] = useState(initialTimeZone);
  const router = useRouter();

  const setTheme = useCallback(
    async (nextTheme: KafilTheme) => {
      if (nextTheme === theme) return;

      await persistPreference(
        "/api/ui-theme",
        { theme: nextTheme },
        "Could not update color theme preference.",
      );

      document.documentElement.classList.toggle("dark", nextTheme === "dark");
      setThemeState(nextTheme);
      router.refresh();
    },
    [router, theme],
  );

  const setTimeZone = useCallback(
    async (nextTimeZone: KafilTimeZone) => {
      const normalized = normalizeKafilTimeZone(nextTimeZone);
      if (normalized === timeZone) return;

      await persistPreference(
        "/api/ui-timezone",
        { timeZone: normalized },
        "Could not update time zone preference.",
      );

      document.documentElement.dataset.timeZone = normalized;
      setTimeZoneState(normalized);
      router.refresh();
    },
    [router, timeZone],
  );

  const value = useMemo<KafilPreferencesContextValue>(
    () => ({ theme, timeZone, setTheme, setTimeZone }),
    [setTheme, setTimeZone, theme, timeZone],
  );

  return (
    <KafilPreferencesContext.Provider value={value}>
      {children}
    </KafilPreferencesContext.Provider>
  );
}

function useKafilPreferences() {
  const context = useContext(KafilPreferencesContext);
  if (!context) {
    throw new Error("Kafil preferences must be read within KafilPreferencesProvider.");
  }
  return context;
}

export function useThemePreference() {
  const { theme, setTheme } = useKafilPreferences();
  return useMemo(() => ({ theme, setTheme }), [setTheme, theme]);
}

export function useKafilTimeZone() {
  const { timeZone, setTimeZone } = useKafilPreferences();
  return useMemo(() => ({ timeZone, setTimeZone }), [setTimeZone, timeZone]);
}
