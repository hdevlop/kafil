import { Service } from "najm-core";

import { NotificationRepository } from "./notificationRepository";

export type NotificationLocale = "en" | "fr" | "ar" | "es";

const SUPPORTED: ReadonlySet<string> = new Set(["en", "fr", "ar", "es"]);

export function normalizeLocale(value: unknown): NotificationLocale | null {
  if (typeof value !== "string") return null;
  const normalized = value.slice(0, 2).toLowerCase();
  return SUPPORTED.has(normalized) ? (normalized as NotificationLocale) : null;
}

@Service()
export class NotificationLocaleResolver {
  constructor(private readonly notifications: NotificationRepository) {}

  /**
   * Snapshot locale at fan-out so retries never change language:
   * applicant payload locale > recipient settings > family Arabic default >
   * English fallback.
   */
  async resolve(
    recipientUserId: string,
    recipientKind: "family" | "sponsor" | "applicant" | "other",
    eventPayload: Record<string, string | number | boolean | null>,
  ): Promise<NotificationLocale> {
    const applicantLocale = normalizeLocale(eventPayload["locale"]);
    if (applicantLocale) return applicantLocale;

    const settingLocale = normalizeLocale(
      await this.notifications.findLocaleSetting(recipientUserId),
    );
    if (settingLocale) return settingLocale;

    if (recipientKind === "family") return "ar";
    return "en";
  }

  async kindForRecipient(recipientUserId: string): Promise<"family" | "sponsor" | "applicant" | "other"> {
    if (await this.notifications.isFamilyRecipient(recipientUserId)) return "family";
    return "other";
  }
}
