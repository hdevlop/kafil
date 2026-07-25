import { describe, expect, it } from "bun:test";
import { z } from "zod";

import {
  MOROCCAN_FEMALE_FIRST_NAMES,
  MOROCCAN_MALE_FIRST_NAMES,
  buildFormFill,
} from "../src/fakers";

const formSchema = z.object({
  familyProfileId: z.uuid(),
  legalName: z.string().min(2),
  email: z.email(),
  household: z.object({ guardianCin: z.string().min(8).max(20) }),
  dateOfBirth: z.iso.date(),
  registrationDate: z.iso.date(),
  housingSituation: z.enum(["owned", "rented", "hosted", "temporary"]),
  supportPriority: z.enum(["normal", "high", "urgent"]),
  gender: z.enum(["M", "F"]),
  quantity: z.coerce.number().int().positive(),
  reason: z.string().min(3),
  children: z.array(
    z.object({
      legalName: z.string().min(2),
      schoolLevel: z.string().optional(),
    }),
  ),
});

describe("development form fill generator", () => {
  it("generates schema-shaped values and accepts live relation overrides", () => {
    const values = buildFormFill(formSchema, {
      familyProfileId: [
        { value: "9cc2c93f-f545-4e07-9f77-f79f08a71dd5" },
      ],
    });

    expect(formSchema.safeParse(values).success).toBe(true);
    expect(values.familyProfileId).toBe(
      "9cc2c93f-f545-4e07-9f77-f79f08a71dd5",
    );
    expect(String(values.legalName).split(" ").length).toBeGreaterThanOrEqual(2);
    expect(values.children).toHaveLength(1);
  });

  it("generates registration dates as recent dates instead of adult birth dates", () => {
    const values = buildFormFill(formSchema);
    const today = new Date();
    const todayInput = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    start.setDate(start.getDate() - 730);
    const startInput = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;

    expect(String(values.registrationDate) >= startInput).toBe(true);
    expect(String(values.registrationDate) <= todayInput).toBe(true);
    expect(values.registrationDate).not.toBe(values.dateOfBirth);
    expect(["owned", "rented", "hosted", "temporary"]).toContain(
      String(values.housingSituation),
    );
    expect(["normal", "high", "urgent"]).toContain(String(values.supportPriority));
  });
  it("keeps generated person names consistent with generated gender", () => {
    const femaleNames = new Set<string>(MOROCCAN_FEMALE_FIRST_NAMES);
    const maleNames = new Set<string>(MOROCCAN_MALE_FIRST_NAMES);

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const values = buildFormFill(formSchema, {
        familyProfileId: "9cc2c93f-f545-4e07-9f77-f79f08a71dd5",
      });
      const firstName = String(values.legalName).split(" ")[0];

      expect(values.gender === "F" ? femaleNames : maleNames).toContain(firstName);
    }
  });
});
