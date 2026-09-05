import { eq } from "drizzle-orm";

import { db } from "../../config/databaseConfig";
import { PLATFORM_SETTINGS_ID, platformSettings } from "./settingSchema";

export function requireFormFillEnabled(
  setting: { formFillEnabled: boolean } | undefined,
): boolean {
  if (!setting) {
    throw new Error("Platform settings not found");
  }

  return setting.formFillEnabled;
}

/**
 * The F8 toggle, read without the container.
 *
 * `SettingService` is a DI singleton that only exists after the server boots,
 * and the server boots on its first API request — so a React Server Component
 * render cannot resolve it. This reads the one column directly instead, next
 * to the table that owns it, rather than teaching the web app about the
 * schema. No authorization is skipped: `GET /settings/form-fill` is
 * deliberately the one route in its controller with no role guard.
 */
export async function readFormFillEnabled(): Promise<boolean> {
  const [setting] = await db
    .select({ formFillEnabled: platformSettings.formFillEnabled })
    .from(platformSettings)
    .where(eq(platformSettings.id, PLATFORM_SETTINGS_ID))
    .limit(1);

  return requireFormFillEnabled(setting);
}
