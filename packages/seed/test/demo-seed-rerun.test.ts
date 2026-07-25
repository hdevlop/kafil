import { describe, expect, it } from "bun:test";

import {
  generateDemoSeedData,
  type DemoFamily,
} from "../src/scripts/demo/generator";
import { familyIntakeNeedsRepair } from "../src/scripts/demo/familyRepair";

describe("demo seed rerun repair", () => {
  function oneFamily(): DemoFamily {
    const data = generateDemoSeedData({
      contributions: 0,
      families: 1,
      operators: 0,
      sponsors: 0,
    });
    return data.families[0]!;
  }

  it("flags missing records, mismatched housing, mismatched dates, and mismatched priority", () => {
    const family = oneFamily();
    const alternativeHousing =
      family.housingSituation === "owned" ? "rented" : "owned";
    const alternativePriority =
      family.supportPriority === "normal" ? "urgent" : "normal";

    expect(familyIntakeNeedsRepair(family, undefined)).toBe(true);
    expect(
      familyIntakeNeedsRepair(family, {
        housingSituation: alternativeHousing,
        registrationDate: family.registrationDate,
        supportPriority: family.supportPriority,
      }),
    ).toBe(true);
    expect(
      familyIntakeNeedsRepair(family, {
        housingSituation: family.housingSituation,
        registrationDate: "1999-01-01",
        supportPriority: family.supportPriority,
      }),
    ).toBe(true);
    expect(
      familyIntakeNeedsRepair(family, {
        housingSituation: family.housingSituation,
        registrationDate: family.registrationDate,
        supportPriority: alternativePriority,
      }),
    ).toBe(true);
  });

  it("leaves matching records alone", () => {
    const family = oneFamily();

    expect(
      familyIntakeNeedsRepair(family, {
        housingSituation: family.housingSituation,
        registrationDate: family.registrationDate,
        supportPriority: family.supportPriority,
      }),
    ).toBe(false);
  });
});
