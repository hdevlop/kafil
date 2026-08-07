"use client";

import { NajmDesignProvider } from "najm-kit";

import { useKafilAppearance } from "@/providers/KafilAppearanceProvider";
import { useThemePreference } from "@/providers/KafilPreferencesProvider";

export function KafilDesignProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const { theme: activeTheme } = useThemePreference();
  const { design } = useKafilAppearance();

  return (
    <NajmDesignProvider
      className="min-h-full"
      config={design}
      mode={activeTheme}
    >
      {children}
    </NajmDesignProvider>
  );
}
