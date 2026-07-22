import { HttpError, Service } from "najm-core";
import { Transaction } from "najm-database";

import { AuditService } from "../audit/auditService";
import {
  type UpdateFundingSettingDto,
  updateFundingSettingDto,
} from "./settingDto";
import { SettingRepository } from "./settingRepository";

@Service()
export class SettingService {
  constructor(
    private readonly settings: SettingRepository,
    private readonly audits: AuditService,
  ) {}

  async getFunding() {
    const setting = await this.settings.find();
    if (!setting) HttpError.notFound("Platform funding setting not found");
    return setting;
  }

  @Transaction({ retries: 2 })
  async updateFunding(
    data: UpdateFundingSettingDto,
    actorUserId: string,
  ) {
    const input = updateFundingSettingDto.parse(data);
    const current = await this.settings.lock();
    if (!current) HttpError.notFound("Platform funding setting not found");

    const setting = await this.settings.updateFundingTarget(
      input.familyFundingTargetMinor,
      actorUserId,
    );
    if (!setting) HttpError.notFound("Platform funding setting not found");

    await this.audits.record({
      action: "settings.familyFundingTargetUpdated",
      actorUserId,
      metadata: {
        previousTargetMinor: current.familyFundingTargetMinor,
        targetMinor: setting.familyFundingTargetMinor,
        reason: input.reason,
      },
      resource: "settings",
      resourceId: setting.id,
    });
    return setting;
  }
}
