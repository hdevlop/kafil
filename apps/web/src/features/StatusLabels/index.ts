import { humanizeToken } from "najm-kit/format";

import { getUiTranslation, type TranslationKey } from "@/i18n/translations";
import type { KafilLanguage } from "@/preferences";

const statusTranslationKeys: Record<string, TranslationKey> = {
  active: "status.active",
  approved: "status.approved",
  cancelled: "status.cancelled",
  delivered: "status.delivered",
  ended: "status.ended",
  inactive: "status.inactive",
  in_preparation: "status.in_preparation",
  purchased: "status.purchased",
  out_for_delivery: "status.out_for_delivery",
  paused: "status.paused",
  pending: "status.pending",
  pending_funding: "status.pending_funding",
  rejected: "status.rejected",
  refunded: "status.refunded",
  stopped: "status.stopped",
  validated: "status.validated",
};

export function getStatusTranslationKey(status: string): TranslationKey | null {
  return statusTranslationKeys[status.trim().toLowerCase()] ?? null;
}

export function formatStatusLabel(
  status: string,
  language: KafilLanguage = "en",
): string {
  const translationKey = getStatusTranslationKey(status);
  if (translationKey) return getUiTranslation(language, translationKey);

  return humanizeToken(status);
}
