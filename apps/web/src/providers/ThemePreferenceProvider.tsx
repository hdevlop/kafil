"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type KafilTheme = "light" | "dark";

interface ThemePreferenceContextValue {
  theme: KafilTheme;
  setTheme: (theme: KafilTheme) => Promise<void>;
}

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null);

export function ThemePreferenceProvider({
  children,
  initialTheme,
}: Readonly<{ children: React.ReactNode; initialTheme: KafilTheme }>) {
  const [theme, setThemeState] = useState(initialTheme);
  const router = useRouter();

  const setTheme = useCallback(async (nextTheme: KafilTheme) => {
    if (nextTheme === theme) return;

    const response = await fetch("/api/ui-theme", {
      body: JSON.stringify({ theme: nextTheme }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    if (!response.ok) throw new Error("Could not update color theme preference.");

    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    setThemeState(nextTheme);
    router.refresh();
  }, [router, theme]);

  const value = useMemo<ThemePreferenceContextValue>(() => ({ theme, setTheme }), [setTheme, theme]);

  return <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>;
}

export function useThemePreference() {
  const context = useContext(ThemePreferenceContext);
  if (!context) throw new Error("useThemePreference must be used within ThemePreferenceProvider.");
  return context;
}
