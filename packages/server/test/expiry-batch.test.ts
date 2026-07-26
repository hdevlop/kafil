import { describe, expect, it } from "bun:test";

import {
  ContributionPlanRepository,
  ContributionRepository,
  ContributionService,
} from "../src/modules/contributions";
import { FundingRepository } from "../src/modules/settings/fundingRepository";
import { SettingService } from "../src/modules/settings/settingService";

const familyId = "00000000-0000-4000-8000-000000000910";
const dueRow = {
  id: "00000000-0000-4000-8000-000000000911",
  familyProfileId: familyId,
  amountMinor: 5000,
  expiresAt: new Date("2026-07-01T00:00:00.000Z"),
};

describe("ContributionService.expireDueBatch", () => {
  it("transitions every due row exactly once and emits one audit/outbox event per row", async () => {
    const expired: string[] = [];
    const audits: Array<{ action: string; resourceId: string }> = [];
    const events: Array<{ topic: string; aggregateId: string }> = [];

    const service = new ContributionService(
      {
        expireIfStillDue: async (id: string) => {
          expired.push(id);
          return true;
        },
      } as unknown as ContributionRepository,
      {} as ContributionPlanRepository,
      {} as never,
      {} as never,
      {
        record: async (input: { action: string; resourceId: string }) => {
          audits.push(input);
          return input;
        },
      } as never,
      {
        enqueue: async (input: { topic: string; aggregateId: string }) => {
          events.push(input);
          return input;
        },
      } as never,
      {} as never,
      {} as never,
      {
        getPendingContributionExpiryHours: async () => 72,
      } as unknown as SettingService,
      {
        duePendingContributionIds: async () => [
          dueRow,
          { ...dueRow, id: "00000000-0000-4000-8000-000000000912" },
        ],
      } as unknown as FundingRepository,
    );

    const result = await service.expireDueBatch(
      new Date("2026-07-02T00:00:00.000Z"),
      100,
    );

    expect(result).toBe(2);
    expect(expired).toHaveLength(2);
    expect(audits).toHaveLength(2);
    expect(events).toHaveLength(2);
    expect(audits.every((a) => a.action === "contribution.expired")).toBe(true);
    expect(events.every((e) => e.topic === "contribution.expired")).toBe(true);
  });

  it("skips rows whose conditional transition did not affect a row", async () => {
    const expired: string[] = [];
    const audits: Array<{ action: string }> = [];
    const events: Array<{ topic: string }> = [];

    const service = new ContributionService(
      {
        expireIfStillDue: async (id: string) => {
          expired.push(id);
          return id === dueRow.id;
        },
      } as unknown as ContributionRepository,
      {} as ContributionPlanRepository,
      {} as never,
      {} as never,
      {
        record: async (input: { action: string }) => {
          audits.push(input);
          return input;
        },
      } as never,
      {
        enqueue: async (input: { topic: string }) => {
          events.push(input);
          return input;
        },
      } as never,
      {} as never,
      {} as never,
      {
        getPendingContributionExpiryHours: async () => 72,
      } as unknown as SettingService,
      {
        duePendingContributionIds: async () => [
          dueRow,
          { ...dueRow, id: "00000000-0000-4000-8000-000000000912" },
        ],
      } as unknown as FundingRepository,
    );

    const result = await service.expireDueBatch(new Date(), 100);

    expect(result).toBe(1);
    expect(expired).toHaveLength(2);
    expect(audits).toHaveLength(1);
    expect(events).toHaveLength(1);
  });
});