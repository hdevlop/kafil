"use client";

import { useCallback } from "react";
import type { NajmTranslate } from "najm-kit";
import { NajmNextUIProvider } from "najm-kit/next";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import type { TranslationKey } from "@/i18n/translations";
import { normalizeKafilTimeZone, type KafilTheme, type KafilTimeZone } from "@/lib/format";
import { useKafilAppearance } from "@/providers/KafilAppearanceProvider";

/**
 * Feeds `NajmNextUIProvider` from Kafil's own context.
 *
 * It has to sit *below* `KafilAppearanceProvider`: the kit takes `design` as a
 * prop, and Kafil's design is context, because the theme editor owns it. An app
 * with a static design config mounts `NajmNextUIProvider` directly and skips
 * this file entirely.
 */
export function KafilUIBridge({
  children,
  initialTheme,
  initialTimeZone,
}: Readonly<{
  children: React.ReactNode;
  initialTheme: KafilTheme;
  initialTimeZone: KafilTimeZone;
}>) {
  const { design } = useKafilAppearance();
  const { t } = useKafilLanguage();

  // The kit types its translator over `string`; Kafil's is keyed to its catalog
  // union, which `strictFunctionTypes` will not narrow into. The keys it asks
  // for are `common.pagination.*`, which the catalog carries in all four locales.
  const translate = useCallback<NajmTranslate>(
    (key, params) => t(key as TranslationKey, params),
    [t],
  );

  return (
    <NajmNextUIProvider
      className="min-h-full"
      design={design}
      initialTheme={initialTheme}
      initialTimeZone={initialTimeZone}
      normalizeTimeZone={normalizeKafilTimeZone}
      t={translate}
    >
      {children}
    </NajmNextUIProvider>
  );
}
