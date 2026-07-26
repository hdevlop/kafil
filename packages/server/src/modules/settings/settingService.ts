import { HttpError, Service } from "najm-core";

import { AuditService } from "../audit/auditService";
import type { UpdateSettingsDto } from "./settingDto";
import { updateSettingsDto } from "./settingDto";
import {
  SettingRepository,
  type PlatformSettingsPatch,
} from "./settingRepository";
import { DEFAULT_PENDING_CONTRIBUTION_EXPIRY_HOURS } from "./settingSchema";

@Service()
export class SettingService {
  constructor(
    private readonly settings: SettingRepository,
    private readonly audits: AuditService,
  ) {}

  async getSettings() {
    const setting = await this.settings.find();
    if (!setting) HttpError.notFound("Platform settings not found");
    return setting;
  }

  async getFormFill() {
    const setting = await this.settings.find();
    if (!setting) HttpError.notFound("Platform setting not found");
    return { enabled: setting.formFillEnabled };
  }

  async getPendingContributionExpiryHours() {
    const setting = await this.settings.find();
    if (!setting) return DEFAULT_PENDING_CONTRIBUTION_EXPIRY_HOURS;
    return setting.pendingContributionExpiryHours;
  }

  async update(data: UpdateSettingsDto, actorUserId: string) {
    const input = updateSettingsDto.parse(data);
    const previous = await this.settings.find();
    const setting = await this.settings.update({
      familyFundingTargetMinor: input.familyFundingTargetMinor,
      pendingContributionExpiryHours: input.pendingContributionExpiryHours,
      formFillEnabled: input.formFillEnabled,
      updatedByUserId: actorUserId,
    });
    if (!setting) HttpError.notFound("Platform settings not found");
    if (
      previous &&
      previous.pendingContributionExpiryHours !== input.pendingContributionExpiryHours
    ) {
      await this.audits.record({
        action: "settings.pendingContributionExpiryUpdated",
        actorUserId,
        metadata: {
          previousHours: previous.pendingContributionExpiryHours,
          expiryHours: input.pendingContributionExpiryHours,
        },
        resource: "platformSettings",
        resourceId: PLATFORM_SETTINGS_REFERENCE,
      });
    }
    return setting;
  }
}

export const PLATFORM_SETTINGS_REFERENCE = "platform";

export type { PlatformSettingsPatch };