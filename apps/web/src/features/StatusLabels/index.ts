import { formatStatusLabel as formatNajmStatusLabel } from "najm-kit/format";

import { kafilUiI18n, type KafilLocale, type UiTranslationKey } from "@kafil/server/locales";

/**
 * Plain-text status label, resolved by the same code the badges use.
 *
 * Najm Kit owns the vocabulary, the four-language labels and the
 * `status.<token>` catalog convention, so this is only the binding that hands
 * it our translator — the app's own wording in `ui.status.*` still wins, and a
 * token neither side knows humanizes.
 */
export function formatStatusLabel(status: string, language: KafilLocale = "en"): string {
  return formatNajmStatusLabel(status, {
    language,
    t: (key) => kafilUiI18n.translate(language, key as UiTranslationKey),
  });
}
