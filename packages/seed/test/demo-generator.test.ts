import { describe, expect, it } from "bun:test";

import {
  createFamilyDto,
  createOperatorDto,
  createSupportAssignmentDto,
  createSponsorDto,
  recordContributionDto,
} from "@kafil/server/modules";

import {
  DEFAULT_DEMO_SEED_COUNTS,
  generateDemoSeedData,
  readDemoSeedCounts,
} from "../src/scripts/demo/generator";
import {
  MOROCCAN_FEMALE_FIRST_NAMES,
  MOROCCAN_LAST_NAMES,
  MOROCCAN_MALE_FIRST_NAMES,
} from "../src/fakers/moroccan-names";

describe("demo seed generator", () => {
  it("keeps the expanded Moroccan name catalog complete and unique", () => {
    expect(MOROCCAN_FEMALE_FIRST_NAMES).toHaveLength(112);
    expect(MOROCCAN_MALE_FIRST_NAMES).toHaveLength(112);
    expect(MOROCCAN_LAST_NAMES).toHaveLength(224);
    expect(new Set(MOROCCAN_FEMALE_FIRST_NAMES).size).toBe(112);
    expect(new Set(MOROCCAN_MALE_FIRST_NAMES).size).toBe(112);
    expect(new Set(MOROCCAN_LAST_NAMES).size).toBe(224);
  });

  it("defaults to the requested Kafil demo account counts", () => {
    const data = generateDemoSeedData({ ...DEFAULT_DEMO_SEED_COUNTS });

    expect(data.families).toHaveLength(20);
    expect(data.sponsors).toHaveLength(50);
    expect(data.operators).toHaveLength(5);
    expect(data.assignments).toHaveLength(50);
    expect(data.contributions).toHaveLength(100);
    expect(data.families.every((family) => family.initialChildren.length >= 1)).toBe(
      true,
    );
  });

  it("accepts SMS-style long, equals, and short count arguments", () => {
    expect(
      readDemoSeedCounts([
        "--families=3",
        "--sponsors",
        "4",
        "-o",
        "2",
        "-c",
        "6",
      ]),
    ).toEqual({ contributions: 6, families: 3, sponsors: 4, operators: 2 });
    expect(() => readDemoSeedCounts(["--families=-1"])).toThrow(
      "--families must be an integer",
    );
  });

  it("produces deterministic, unique records accepted by server DTOs", () => {
    const counts = { contributions: 8, families: 4, sponsors: 4, operators: 4 };
    const referenceDate = new Date("2026-07-20T10:00:00.000Z");
    const first = generateDemoSeedData(counts, referenceDate);
    const second = generateDemoSeedData(counts, referenceDate);
    const accounts = [...first.families, ...first.sponsors, ...first.operators];

    expect(first).toEqual(second);
    expect(new Set(accounts.map((account) => account.email)).size).toBe(12);
    expect(new Set(accounts.map((account) => account.userId)).size).toBe(12);
    expect(new Set(accounts.map((account) => account.id)).size).toBe(12);
    expect(new Set(accounts.map((account) => account.name)).size).toBe(12);

    for (const family of first.families) {
      expect(createFamilyDto.safeParse(family).success).toBe(true);
    }
    for (const sponsor of first.sponsors) {
      expect(createSponsorDto.safeParse(sponsor).success).toBe(true);
    }
    for (const operator of first.operators) {
      expect(createOperatorDto.safeParse(operator).success).toBe(true);
    }
    for (const assignment of first.assignments) {
      expect(createSupportAssignmentDto.safeParse(assignment).success).toBe(true);
    }
    for (const contribution of first.contributions) {
      expect(
        recordContributionDto.safeParse({
          supportAssignmentId: first.assignments[0]!.sponsorProfileId,
          amountMinor: contribution.amountMinor,
          paymentMethod: contribution.paymentMethod,
          externalReference: contribution.externalReference,
          paidAt: contribution.paidAt,
        }).success,
      ).toBe(true);
    }

    expect(fundingStates(first)).toEqual({ full: 1, pending: 2, zero: 1 });
  });

  it("distributes family funding as 30% full, 50% pending, and 20% zero", () => {
    const data = generateDemoSeedData({
      contributions: 100,
      families: 10,
      operators: 0,
      sponsors: 10,
    });

    expect(fundingStates(data)).toEqual({ full: 3, pending: 5, zero: 2 });
  });

  it("keeps high contribution counts positive without overfunding", () => {
    const data = generateDemoSeedData({
      contributions: 10_000,
      families: 1,
      operators: 0,
      sponsors: 1,
    });
    const validated = data.contributions.filter(
      (contribution) => contribution.expectedStatus === "validated",
    );

    expect(validated.every((contribution) => contribution.amountMinor > 0)).toBe(
      true,
    );
    expect(fundingStates(data)).toEqual({ full: 0, pending: 1, zero: 0 });
  });

  it("uses a large Moroccan name pool without guardian and sponsor collisions", () => {
    const data = generateDemoSeedData({
      contributions: 0,
      families: 1_000,
      operators: 100,
      sponsors: 1_000,
    });
    const adultNames = [
      ...data.families.map((family) => family.name),
      ...data.operators.map((operator) => operator.name),
      ...data.sponsors.map((sponsor) => sponsor.name),
    ];

    expect(new Set(adultNames).size).toBe(adultNames.length);
    expect(adultNames.every(isMoroccanName)).toBe(true);
  });

  it("distributes contribution dates across the trailing 12 months", () => {
    const referenceDate = new Date("2026-07-20T10:00:00.000Z");
    const data = generateDemoSeedData(
      { contributions: 24, families: 4, sponsors: 4, operators: 0 },
      referenceDate,
    );
    const months = new Set(
      data.contributions.map((contribution) => contribution.paidAt.slice(0, 7)),
    );

    expect([...months].sort()).toEqual([
      "2025-08",
      "2025-09",
      "2025-10",
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
    ]);
    expect(
      data.contributions.every(
        (contribution) =>
          new Date(`${contribution.paidAt}T12:00:00.000Z`) <= referenceDate,
      ),
    ).toBe(true);
  });

  it("requires relationships when contributions are requested", () => {
    expect(() =>
      generateDemoSeedData({
        contributions: 1,
        families: 0,
        operators: 0,
        sponsors: 0,
      }),
    ).toThrow("Contributions require at least one sponsor and one family");
  });
});

function fundingStates(
  data: ReturnType<typeof generateDemoSeedData>,
): Record<"full" | "pending" | "zero", number> {
  return data.families.reduce(
    (states, family) => {
      const fundedMinor = data.contributions
        .filter(
          (contribution) =>
            contribution.familyProfileId === family.id &&
            contribution.expectedStatus === "validated",
        )
        .reduce((total, contribution) => total + contribution.amountMinor, 0);
      const state =
        fundedMinor === 0
          ? "zero"
          : fundedMinor === family.fundingTargetMinor
            ? "full"
            : "pending";
      states[state] += 1;
      return states;
    },
    { full: 0, pending: 0, zero: 0 },
  );
}

function isMoroccanName(name: string) {
  const firstNames: readonly string[] = [
    ...MOROCCAN_FEMALE_FIRST_NAMES,
    ...MOROCCAN_MALE_FIRST_NAMES,
  ];

  return (
    firstNames.some((firstName) => name.startsWith(`${firstName} `)) &&
    MOROCCAN_LAST_NAMES.some((lastName) => name.endsWith(` ${lastName}`))
  );
}
