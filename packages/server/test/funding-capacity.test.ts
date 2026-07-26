import { describe, expect, it } from "bun:test";

import {
  calculateCapacity,
} from "../src/modules/settings/fundingCapacity";
import {
  type FamilyFundingProgress,
  FundingService,
} from "../src/modules/settings";
import { FundingRepository } from "../src/modules/settings/fundingRepository";

const familyId = "00000000-0000-4000-8000-000000000901";

function fundingService({
  targetMinor,
  fundedMinor,
  pendingMinor = 0,
  pendingExcluding = null,
}: {
  targetMinor: number;
  fundedMinor: number;
  pendingMinor?: number;
  pendingExcluding?: number | null;
}) {
  return new FundingService(
    {
      findById: async () => ({
        id: familyId,
        fundingStatus: "pending_funding",
        fundingTargetMinor: targetMinor,
        fundingActivatedAt: null,
      }),
      activateFunding: async () => ({ id: familyId }),
    } as never,
    {
      findByFamilyId: async () => ({ id: "budget-account" }),
    } as never,
    {
      validatedFundingTotal: async () => fundedMinor,
    } as never,
    {} as never,
    {} as never,
    {
      livePendingTotalForFamily: async () => ({ amountMinor: pendingMinor }),
      livePendingTotalForFamilyExcluding: async () => ({
        amountMinor: pendingExcluding ?? pendingMinor,
      }),
      earliestPendingExpiry: async () => null,
    } as unknown as FundingRepository,
  );
}

describe("family funding capacity calculations", () => {
  it("returns open when funded is below target with no pending", () => {
    expect(
      calculateCapacity({
        targetMinor: 10000,
        fundedMinor: 0,
        pendingMinor: 0,
      }).status,
    ).toBe("open");
  });

  it("returns funded when validated funding reaches target", () => {
    expect(
      calculateCapacity({
        targetMinor: 10000,
        fundedMinor: 10000,
        pendingMinor: 0,
      }).status,
    ).toBe("funded");
  });

  it("returns reserved when pending covers the remaining capacity exactly", () => {
    expect(
      calculateCapacity({
        targetMinor: 10000,
        fundedMinor: 4000,
        pendingMinor: 6000,
      }).status,
    ).toBe("reserved");
  });

  it("returns open when capacity is partially covered", () => {
    expect(
      calculateCapacity({
        targetMinor: 10000,
        fundedMinor: 4000,
        pendingMinor: 3000,
      }).status,
    ).toBe("open");
  });

  it("treats legacy over-cap validated funding as funded with zero available", () => {
    expect(
      calculateCapacity({
        targetMinor: 10000,
        fundedMinor: 12000,
        pendingMinor: 0,
      }),
    ).toEqual({
      status: "funded",
      targetMinor: 10000,
      fundedMinor: 12000,
      pendingMinor: 0,
      remainingMinor: 0,
      availableToContributeMinor: 0,
    });
  });

  it("never produces a negative available amount", () => {
    const cap = calculateCapacity({
      targetMinor: 100,
      fundedMinor: 0,
      pendingMinor: 500,
    });
    expect(cap.availableToContributeMinor).toBe(0);
    expect(cap.status).toBe("reserved");
  });
});

describe("contribution validation capacity rules", () => {
  it("rejects a validation that would push validated funding above the target", async () => {
    const service = fundingService({
      targetMinor: 10000,
      fundedMinor: 6000,
    });
    await expect(
      service.ensureContributionCanValidate(familyId, 5000),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("accepts a validation whose own pending reservation is excluded", async () => {
    const service = fundingService({
      targetMinor: 10000,
      fundedMinor: 0,
      pendingMinor: 10000,
    });
    await expect(
      service.ensureContributionCanValidate(familyId, 10000),
    ).resolves.toBeDefined();
  });

  it("still rejects a validation whose amount plus funded funding overflows the target", async () => {
    const service = fundingService({
      targetMinor: 10000,
      fundedMinor: 4000,
      pendingMinor: 0,
    });
    await expect(
      service.ensureContributionCanValidate(familyId, 7000),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("rejects when the family is already funded", async () => {
    const service = fundingService({
      targetMinor: 10000,
      fundedMinor: 10000,
    });
    await expect(
      service.ensureContributionCanValidate(familyId, 1),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe("family funding progress contract", () => {
  it("includes capacity fields in the progress projection", async () => {
    const progress = (await fundingService({
      targetMinor: 10000,
      fundedMinor: 3000,
      pendingMinor: 2000,
    }).getProgress(familyId)) as FamilyFundingProgress;
    expect(progress).toMatchObject({
      targetMinor: 10000,
      fundedMinor: 3000,
      pendingMinor: 2000,
      remainingMinor: 7000,
      availableToContributeMinor: 5000,
      capacityStatus: "open",
    });
  });
});