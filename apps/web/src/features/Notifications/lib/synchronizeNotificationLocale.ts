import type { NotificationLocale } from "../types";

interface NotificationLocaleSyncDependencies {
  getSettings: () => Promise<{ locale: NotificationLocale }>;
  updateSettings: (locale: NotificationLocale) => Promise<unknown>;
}

/**
 * Reconcile the durable external-channel locale without allowing a provider or
 * API failure to roll back the already-applied UI language change.
 */
export async function synchronizeNotificationLocale(
  locale: NotificationLocale,
  dependencies: NotificationLocaleSyncDependencies,
): Promise<boolean> {
  try {
    const settings = await dependencies.getSettings();
    if (settings.locale !== locale) {
      await dependencies.updateSettings(locale);
    }
    return true;
  } catch {
    return false;
  }
}
