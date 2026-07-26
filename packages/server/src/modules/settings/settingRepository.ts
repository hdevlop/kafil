import { eq } from "drizzle-orm";
import type { NajmDesignConfig } from "najm-kit";
import { Repository } from "najm-core";
import { DB } from "najm-database";

import type { KafilDatabase } from "../../database/types";
import { PLATFORM_SETTINGS_ID, platformSettings } from "./settingSchema";

export interface PlatformSettingsPatch {
  familyFundingTargetMinor: number;
  pendingContributionExpiryHours: number;
  formFillEnabled: boolean;
  updatedByUserId: string;
}

export interface PlatformSettingRow {
  id: string;
  familyFundingTargetMinor: number;
  pendingContributionExpiryHours: number;
  formFillEnabled: boolean;
  designConfig: NajmDesignConfig | null;
  appearanceRevision: number;
  currency: string;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

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

  async update(patch: PlatformSettingsPatch) {
    const [setting] = await this.db
      .update(platformSettings)
      .set({
        familyFundingTargetMinor: patch.familyFundingTargetMinor,
        pendingContributionExpiryHours: patch.pendingContributionExpiryHours,
        formFillEnabled: patch.formFillEnabled,
        updatedByUserId: patch.updatedByUserId,
        updatedAt: new Date(),
      })
      .where(eq(platformSettings.id, PLATFORM_SETTINGS_ID))
      .returning();
    return setting;
  }
}