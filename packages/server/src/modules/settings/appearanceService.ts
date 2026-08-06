import { HttpError, Service } from "najm-core";
import { Transaction } from "najm-database";
import type { NajmDesignConfig } from "najm-kit";

import { AuditService } from "../audit/auditService";
import {
  type ResetAppearanceDto,
  resetAppearanceDto,
  type UpdateAppearanceDto,
  updateAppearanceDto,
} from "./appearanceDto";
import { getFactoryDesignConfig } from "./appearanceFactory";
import { AppearanceRepository } from "./appearanceRepository";
import type { PublicAppearance } from "./appearanceTypes";
import { AppearanceValidator } from "./appearanceValidator";
import {
  DEFAULT_APPEARANCE_REVISION,
  PLATFORM_SETTINGS_ID,
} from "./settingSchema";

@Service()
export class AppearanceService {
  constructor(
    private readonly appearances: AppearanceRepository,
    private readonly audits: AuditService,
    private readonly validator: AppearanceValidator,
  ) {}

  async get(): Promise<PublicAppearance> {
    try {
      const setting = await this.appearances.find();
      if (!setting) return factoryProjection(DEFAULT_APPEARANCE_REVISION);
      return this.project(setting.designConfig, setting.appearanceRevision);
    } catch {
      console.warn(
        "[appearance] failed to read platform appearance; using factory theme",
      );
      return factoryProjection(DEFAULT_APPEARANCE_REVISION);
    }
  }

  @Transaction({ retries: 2 })
  async save(
    data: UpdateAppearanceDto,
    actorUserId: string,
  ): Promise<PublicAppearance> {
    const input = updateAppearanceDto.parse(data);
    const setting = await this.appearances.lock();
    if (!setting) HttpError.notFound("Platform settings not found");
    ensureExpectedRevision(
      setting.appearanceRevision,
      input.expectedRevision,
    );

    const current = this.resolveDesign(
      setting.designConfig,
      setting.appearanceRevision,
    );
    const next = this.validator.mergeEditable(current, input.designConfig);
    const nextRevision = setting.appearanceRevision + 1;
    const updated = await this.appearances.write({
      appearanceRevision: nextRevision,
      designConfig: next,
      updatedByUserId: actorUserId,
    });
    if (!updated) HttpError.notFound("Platform settings not found");

    await this.audits.record({
      action: "appearance.themeUpdated",
      actorUserId,
      metadata: {
        previousRevision: setting.appearanceRevision,
        newRevision: nextRevision,
        changedGroups: this.validator.changedGroups(current, next),
      },
      resource: "platformSettings",
      resourceId: PLATFORM_SETTINGS_ID,
    });

    return { designConfig: next, revision: nextRevision };
  }

  /**
   * Replaces the whole stored design with an already validated configuration.
   * Unlike `save`, this does not merge onto the current design: a theme preset
   * is a complete design and must round-trip exactly as it was captured.
   */
  @Transaction({ retries: 2 })
  async replaceDesign(
    designConfig: NajmDesignConfig,
    expectedRevision: number,
    actorUserId: string,
    audit: { action: string; metadata: Record<string, unknown> },
  ): Promise<PublicAppearance> {
    const next = this.validator.parse(designConfig);
    const setting = await this.appearances.lock();
    if (!setting) HttpError.notFound("Platform settings not found");
    ensureExpectedRevision(setting.appearanceRevision, expectedRevision);

    const current = this.resolveDesign(
      setting.designConfig,
      setting.appearanceRevision,
    );
    const nextRevision = setting.appearanceRevision + 1;
    const updated = await this.appearances.write({
      appearanceRevision: nextRevision,
      designConfig: next,
      updatedByUserId: actorUserId,
    });
    if (!updated) HttpError.notFound("Platform settings not found");

    await this.audits.record({
      action: audit.action,
      actorUserId,
      metadata: {
        ...audit.metadata,
        previousRevision: setting.appearanceRevision,
        newRevision: nextRevision,
        changedGroups: this.validator.changedGroups(current, next),
      },
      resource: "platformSettings",
      resourceId: PLATFORM_SETTINGS_ID,
    });

    return { designConfig: next, revision: nextRevision };
  }

  @Transaction({ retries: 2 })
  async reset(
    data: ResetAppearanceDto,
    actorUserId: string,
  ): Promise<PublicAppearance> {
    const input = resetAppearanceDto.parse(data);
    const setting = await this.appearances.lock();
    if (!setting) HttpError.notFound("Platform settings not found");
    ensureExpectedRevision(
      setting.appearanceRevision,
      input.expectedRevision,
    );

    const current = this.resolveDesign(
      setting.designConfig,
      setting.appearanceRevision,
    );
    const factory = getFactoryDesignConfig();
    const nextRevision = setting.appearanceRevision + 1;
    const updated = await this.appearances.write({
      appearanceRevision: nextRevision,
      designConfig: null,
      updatedByUserId: actorUserId,
    });
    if (!updated) HttpError.notFound("Platform settings not found");

    await this.audits.record({
      action: "appearance.themeReset",
      actorUserId,
      metadata: {
        previousRevision: setting.appearanceRevision,
        newRevision: nextRevision,
        changedGroups: this.validator.changedGroups(current, factory),
      },
      resource: "platformSettings",
      resourceId: PLATFORM_SETTINGS_ID,
    });

    return { designConfig: factory, revision: nextRevision };
  }

  private project(
    designConfig: unknown,
    revision: number,
  ): PublicAppearance {
    return {
      designConfig: this.resolveDesign(designConfig, revision),
      revision,
    };
  }

  private resolveDesign(designConfig: unknown, revision: number) {
    if (designConfig === null || designConfig === undefined) {
      return getFactoryDesignConfig();
    }

    const parsed = this.validator.safeParse(designConfig);
    if (parsed.success) return parsed.data;

    console.warn(
      `[appearance] invalid stored design at revision ${revision}; using factory theme`,
    );
    return getFactoryDesignConfig();
  }
}

function ensureExpectedRevision(actual: number, expected: number) {
  if (actual !== expected) {
    HttpError.conflict("Platform appearance changed; reload and try again");
  }
}

function factoryProjection(revision: number): PublicAppearance {
  return { designConfig: getFactoryDesignConfig(), revision };
}
