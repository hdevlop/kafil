import { eq } from "drizzle-orm";
import type { NajmDesignConfig } from "najm-kit";
import { Repository } from "najm-core";
import { DB } from "najm-database";

import type { KafilDatabase } from "../../database/types";
import { PLATFORM_SETTINGS_ID, platformSettings } from "./settingSchema";

export interface AppearanceWrite {
  appearanceRevision: number;
  designConfig: NajmDesignConfig | null;
  updatedByUserId: string;
}

const appearanceSelection = {
  appearanceRevision: platformSettings.appearanceRevision,
  designConfig: platformSettings.designConfig,
};

@Repository("default")
export class AppearanceRepository {
  @DB() private db!: KafilDatabase;

  async find() {
    const [setting] = await this.db
      .select(appearanceSelection)
      .from(platformSettings)
      .where(eq(platformSettings.id, PLATFORM_SETTINGS_ID))
      .limit(1);
    return setting;
  }

  async lock() {
    const [setting] = await this.db
      .select(appearanceSelection)
      .from(platformSettings)
      .where(eq(platformSettings.id, PLATFORM_SETTINGS_ID))
      .limit(1)
      .for("update");
    return setting;
  }

  async write(input: AppearanceWrite) {
    const [setting] = await this.db
      .update(platformSettings)
      .set({
        appearanceRevision: input.appearanceRevision,
        designConfig: input.designConfig,
        updatedByUserId: input.updatedByUserId,
        updatedAt: new Date(),
      })
      .where(eq(platformSettings.id, PLATFORM_SETTINGS_ID))
      .returning(appearanceSelection);
    return setting;
  }
}
