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
    const patch: PlatformSettingsPatch = {
      familyFundingTargetMinor: input.familyFundingTargetMinor,
      pendingContributionExpiryHours: input.pendingContributionExpiryHours,
      formFillEnabled: input.formFillEnabled,
      updatedByUserId: actorUserId,
    };
    if (input.defaultMaxOrdersPerMonth !== undefined) {
      patch.defaultMaxOrdersPerMonth = input.defaultMaxOrdersPerMonth ?? null;
    }
    if (input.defaultMaxBudgetPerOrderMinor !== undefined) {
      patch.defaultMaxBudgetPerOrderMinor =
        input.defaultMaxBudgetPerOrderMinor ?? null;
    }
    if (input.defaultMonthlyBudgetMinor !== undefined) {
      patch.defaultMonthlyBudgetMinor = input.defaultMonthlyBudgetMinor ?? null;
    }
    const setting = await this.settings.update(patch);
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
    const previousLimits = {
      defaultMaxOrdersPerMonth: (previous as { defaultMaxOrdersPerMonth?: number | null } | null)?.defaultMaxOrdersPerMonth ?? null,
      defaultMaxBudgetPerOrderMinor: (previous as { defaultMaxBudgetPerOrderMinor?: number | null } | null)?.defaultMaxBudgetPerOrderMinor ?? null,
      defaultMonthlyBudgetMinor: (previous as { defaultMonthlyBudgetMinor?: number | null } | null)?.defaultMonthlyBudgetMinor ?? null,
    };
    const nextLimits = {
      defaultMaxOrdersPerMonth: (setting as { defaultMaxOrdersPerMonth?: number | null }).defaultMaxOrdersPerMonth ?? null,
      defaultMaxBudgetPerOrderMinor: (setting as { defaultMaxBudgetPerOrderMinor?: number | null }).defaultMaxBudgetPerOrderMinor ?? null,
      defaultMonthlyBudgetMinor: (setting as { defaultMonthlyBudgetMinor?: number | null }).defaultMonthlyBudgetMinor ?? null,
    };
    if (
      previous &&
      (previousLimits.defaultMaxOrdersPerMonth !== nextLimits.defaultMaxOrdersPerMonth ||
        previousLimits.defaultMaxBudgetPerOrderMinor !==
          nextLimits.defaultMaxBudgetPerOrderMinor ||
        previousLimits.defaultMonthlyBudgetMinor !==
          nextLimits.defaultMonthlyBudgetMinor)
    ) {
      await this.audits.record({
        action: "settings.orderLimitsUpdated",
        actorUserId,
        metadata: {
          previous: previousLimits,
          updated: nextLimits,
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