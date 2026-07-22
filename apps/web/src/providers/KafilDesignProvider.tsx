"use client";

import { NajmDesignProvider, parseNajmDesignConfig } from "najm-kit";
import { useThemePreference } from "@/providers/ThemePreferenceProvider";

import themeJson from "../../../../theme.json";

const designConfig = parseNajmDesignConfig(themeJson);

export function KafilDesignProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const { theme: activeTheme } = useThemePreference();

  return (
    <NajmDesignProvider
      className="min-h-full"
      config={designConfig}
      mode={activeTheme}
    >
      {children}
    </NajmDesignProvider>
  );
}
