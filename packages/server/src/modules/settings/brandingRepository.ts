import { eq } from "drizzle-orm";
import { Repository } from "najm-core";
import { DB } from "najm-database";

import type { KafilDatabase } from "../../database/types";
import {
  PLATFORM_SETTINGS_ID,
  platformSettings,
} from "./settingSchema";
import type {
  BrandingAssetReferences,
  StoredBranding,
} from "./brandingTypes";

export interface BrandingWrite {
  sidebarLogoExpandedPath: string | null;
  sidebarLogoCollapsedPath: string | null;
  authLogoPath: string | null;
  authHeroImagePath: string | null;
  brandingRevision: number;
  updatedByUserId: string;
}

const brandingSelection = {
  sidebarLogoExpandedPath: platformSettings.sidebarLogoExpandedPath,
  sidebarLogoCollapsedPath: platformSettings.sidebarLogoCollapsedPath,
  authLogoPath: platformSettings.authLogoPath,
  authHeroImagePath: platformSettings.authHeroImagePath,
  brandingRevision: platformSettings.brandingRevision,
};

const brandingReferencesSelection = {
  sidebarLogoExpandedPath: platformSettings.sidebarLogoExpandedPath,
  sidebarLogoCollapsedPath: platformSettings.sidebarLogoCollapsedPath,
  authLogoPath: platformSettings.authLogoPath,
  authHeroImagePath: platformSettings.authHeroImagePath,
};

@Repository("default")
export class BrandingRepository {
  @DB() private db!: KafilDatabase;

  async find(): Promise<StoredBranding | undefined> {
    const [setting] = await this.db
      .select(brandingSelection)
      .from(platformSettings)
      .where(eq(platformSettings.id, PLATFORM_SETTINGS_ID))
      .limit(1);
    return setting;
  }

  async lock(): Promise<StoredBranding | undefined> {
    const [setting] = await this.db
      .select(brandingSelection)
      .from(platformSettings)
      .where(eq(platformSettings.id, PLATFORM_SETTINGS_ID))
      .limit(1)
      .for("update");
    return setting;
  }

  async write(input: BrandingWrite): Promise<StoredBranding | undefined> {
    const [setting] = await this.db
      .update(platformSettings)
      .set({
        sidebarLogoExpandedPath: input.sidebarLogoExpandedPath,
        sidebarLogoCollapsedPath: input.sidebarLogoCollapsedPath,
        authLogoPath: input.authLogoPath,
        authHeroImagePath: input.authHeroImagePath,
        brandingRevision: input.brandingRevision,
        updatedByUserId: input.updatedByUserId,
        updatedAt: new Date(),
      })
      .where(eq(platformSettings.id, PLATFORM_SETTINGS_ID))
      .returning(brandingSelection);
    return setting;
  }

  async readReferences(): Promise<BrandingAssetReferences | undefined> {
    const [setting] = await this.db
      .select(brandingReferencesSelection)
      .from(platformSettings)
      .where(eq(platformSettings.id, PLATFORM_SETTINGS_ID))
      .limit(1);
    if (!setting) return undefined;
    return {
      sidebarLogoExpandedPath: setting.sidebarLogoExpandedPath,
      sidebarLogoCollapsedPath: setting.sidebarLogoCollapsedPath,
      authLogoPath: setting.authLogoPath,
      authHeroImagePath: setting.authHeroImagePath,
    };
  }
}
