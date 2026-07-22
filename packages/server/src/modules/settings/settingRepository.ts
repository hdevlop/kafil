import { eq } from "drizzle-orm";
import { Repository } from "najm-core";
import { DB } from "najm-database";

import type { KafilDatabase } from "../../database/types";
import { PLATFORM_SETTINGS_ID, platformSettings } from "./settingSchema";

@Repository("default")
export class SettingRepository {
  @DB() private db!: KafilDatabase;

  async find() {
    const [setting] = await this.db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.id, PLATFORM_SETTINGS_ID))
      .limit(1);
    return setting;
  }

  async lock() {
    const [setting] = await this.db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.id, PLATFORM_SETTINGS_ID))
      .limit(1)
      .for("update");
    return setting;
  }

  async updateFundingTarget(
    familyFundingTargetMinor: number,
    updatedByUserId: string,
  ) {
    const [setting] = await this.db
      .update(platformSettings)
      .set({
        familyFundingTargetMinor,
        updatedByUserId,
        updatedAt: new Date(),
      })
      .where(eq(platformSettings.id, PLATFORM_SETTINGS_ID))
      .returning();
    return setting;
  }
}
