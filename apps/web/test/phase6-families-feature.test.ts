import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import {
  createFamilyFormSchema,
  familyStatusFormSchema,
  maskGuardianCin,
  toCreateFamilyInput,
  toUpdateFamilyInput,
  updateFamilyFormSchema,
} from "../src/features/Families/config/familySchemas";
import { familyHousingItems } from "../src/features/Families/config/housingOptions";
import { createFamilyDefaultValues } from "../src/features/Families/components/FamilyForms";
import { buildFormFill } from "najm-kit";
import { localDateInput } from "najm-kit/format";
import { familyKeys } from "../src/features/Families/hooks/familyKeys";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("Phase 6C family invitation form", () => {
  test("creates a family invitation with its own activation target", () => {
    const values = createFamilyFormSchema.parse({
      name: "Amina Guardian",
      email: "amina@example.com",
      guardianCin: "ab123456",
       guardianDateOfBirth: "1987-03-12",
       exactAddress: "12 Example Street, Casablanca",
       housingSituation: "rented",
       registrationDate: "2026-01-15",
       supportPriority: "normal",
       phone: "+212600000001",
      activationTargetMad: "7200",
      initialChildren: [],
      relationshipToChildren: "Mother",
      notes: "",
    });

    const input = toCreateFamilyInput(values);

    expect(input).toEqual({
      name: "Amina Guardian",
      email: "amina@example.com",
      guardianCin: "AB123456",
       guardianDateOfBirth: "1987-03-12",
       exactAddress: "12 Example Street, Casablanca",
       housingSituation: "rented",
       registrationDate: "2026-01-15",
       supportPriority: "normal",
       phone: "+212600000001",
      fundingTargetMinor: 720000,
      initialChildren: [],
      relationshipToChildren: "Mother",
      notes: null,
    });
    expect(input).not.toHaveProperty("password");
    expect(input).not.toHaveProperty("role");
    expect(input).not.toHaveProperty("status");
  });

  test("creates a family with normalized initial children", () => {
    const values = createFamilyFormSchema.parse({
      name: "Youssef Guardian",
      email: "youssef@example.com",
      guardianCin: "cd987654",
       guardianDateOfBirth: "1982-09-21",
       exactAddress: "12 Example Street, Casablanca",
       housingSituation: "hosted",
       registrationDate: "2026-02-10",
       supportPriority: "high",
       phone: "+212600000002",
      activationTargetMad: "8500.50",
      initialChildren: [
        {
          legalName: "Sara Youssef",
          dateOfBirth: "2015-04-18",
          gender: "F",
          schoolLevel: "Primary",
          clothingSize: "",
          shoeSize: "",
          notes: "",
        },
      ],
      relationshipToChildren: "Father",
      notes: "Intake completed",
    });

    expect(toCreateFamilyInput(values)).toEqual({
      name: "Youssef Guardian",
      email: "youssef@example.com",
      guardianCin: "CD987654",
       guardianDateOfBirth: "1982-09-21",
       exactAddress: "12 Example Street, Casablanca",
       housingSituation: "hosted",
       registrationDate: "2026-02-10",
       supportPriority: "high",
       phone: "+212600000002",
      fundingTargetMinor: 850050,
      initialChildren: [
        {
          legalName: "Sara Youssef",
          dateOfBirth: "2015-04-18",
          gender: "F",
          schoolLevel: "Primary",
          clothingSize: null,
          shoeSize: null,
          notes: null,
        },
      ],
      relationshipToChildren: "Father",
      notes: "Intake completed",
    });
  });

  test("requires guardian CIN, a family address, and an activation target", () => {
    const common = {
      name: "Family Guardian",
      email: "family@example.com",
      guardianDateOfBirth: "1985-01-01",
      initialChildren: [],
      relationshipToChildren: "Guardian",
      notes: "",
    };

    expect(
      createFamilyFormSchema.safeParse({
        ...common,
        guardianCin: "AB123456",
        exactAddress: "",
        phone: "",
        activationTargetMad: "7200",
      }).success,
    ).toBe(false);

    expect(
      createFamilyFormSchema.safeParse({
        ...common,
        guardianCin: "AB123456",
        exactAddress: "Another exact address",
        phone: "",
        activationTargetMad: "",
      }).success,
    ).toBe(false);

    expect(
      createFamilyFormSchema.safeParse({
        ...common,
        guardianCin: "",
        exactAddress: "Another exact address",
        phone: "",
        activationTargetMad: "7200",
      }).success,
    ).toBe(false);
  });

  test("defaults the household step to a local registration date and explicit priority", () => {
    const defaults = createFamilyDefaultValues();

    expect(String(defaults.housingSituation)).toBe("");
    expect(defaults.registrationDate).toBe(localDateInput());
    expect(defaults.supportPriority).toBe("normal");
  });

  test("fills all three family steps with create-valid household data", () => {
    const values = createFamilyFormSchema.parse({
      ...createFamilyDefaultValues(),
      ...buildFormFill(createFamilyFormSchema),
    });

    expect(createFamilyFormSchema.safeParse(values).success).toBe(true);
    expect(["owned", "rented", "hosted", "temporary"]).toContain(
      values.housingSituation,
    );
    expect(values.housingSituation).not.toBe("unknown");
    expect(["normal", "high", "urgent"]).toContain(values.supportPriority);
    expect(values.initialChildren).toHaveLength(1);
  });
  test("masks guardian CIN in operator displays", () => {
    expect(maskGuardianCin("AB123456")).toBe("AB****56");
    expect(maskGuardianCin(null)).toBe("Not provided");
  });
});

describe("family housing select options", () => {
  const labels = {
    hosted: "Hosted",
    owned: "Owned",
    rented: "Rented",
    temporary: "Temporary",
    unknown: "Not recorded",
  };

  test("offers create-valid housing values when no historical unknown is selected", () => {
    const items = familyHousingItems("rented", labels, "Not recorded");

    expect(items.map((item) => item.value)).toEqual([
      "owned",
      "rented",
      "hosted",
      "temporary",
    ]);
    expect(items.map((item) => item.label)).toEqual([
      "Owned",
      "Rented",
      "Hosted",
      "Temporary",
    ]);
  });

  test("keeps the unknown option visible while editing a historical unknown family", () => {
    const items = familyHousingItems("unknown", labels, "Not recorded");

    expect(items.map((item) => item.value)).toEqual([
      "owned",
      "rented",
      "hosted",
      "temporary",
      "unknown",
    ]);
    expect(items.at(-1)?.label).toBe("Not recorded");
  });

  test("removes the unknown option once a recorded value is chosen", () => {
    const opening = familyHousingItems("unknown", labels, "Not recorded");
    expect(opening.some((item) => item.value === "unknown")).toBe(true);

    const afterCorrection = familyHousingItems(
      "rented",
      labels,
      "Not recorded",
    );
    expect(afterCorrection.some((item) => item.value === "unknown")).toBe(
      false,
    );
  });
});

describe("Phase 6C family lifecycle contracts", () => {
  test("waits for a hydrated user and access token before protected family lists", () => {
    const hooks = readSource("../src/features/Families/hooks/useFamilies.ts");

    expect(hooks).toContain('import { useAuth } from "najm-auth/client/react";');
    expect(hooks.match(/const \{ accessToken, user \} = useAuth\(\);/g)).toHaveLength(5);
    expect(hooks.match(/enabled: Boolean\(user && accessToken\) && enabled,/g)).toHaveLength(5);
    expect(hooks.match(/user\?\.role/g)).toHaveLength(5);
    expect(hooks.match(/user\?\.id/g)).toHaveLength(5);
  });

  test("uses the complete profile form without create-only child rows when updating a family", () => {
    const values = updateFamilyFormSchema.parse({
      name: "Amina Guardian",
      email: "amina@example.com",
      guardianCin: "ab123456",
       guardianDateOfBirth: "1987-03-12",
       exactAddress: "12 Example Street, Casablanca",
       housingSituation: "rented",
       registrationDate: "2026-01-15",
       supportPriority: "normal",
       phone: "+212600000001",
      relationshipToChildren: "Legal guardian",
      notes: "  ",
      activationTargetMad: "6400",
    });

    expect(toUpdateFamilyInput(values)).toEqual({
      name: "Amina Guardian",
      email: "amina@example.com",
      guardianCin: "AB123456",
       guardianDateOfBirth: "1987-03-12",
       exactAddress: "12 Example Street, Casablanca",
       housingSituation: "rented",
       registrationDate: "2026-01-15",
       supportPriority: "normal",
       phone: "+212600000001",
      relationshipToChildren: "Legal guardian",
      notes: null,
      fundingTargetMinor: 640000,
    });
    expect(updateFamilyFormSchema.safeParse({ ...values, initialChildren: [] }).data)
      .not.toHaveProperty("initialChildren");
  });

  test("requires a reason for lifecycle commands", () => {
    expect(familyStatusFormSchema.safeParse({ reason: "" }).success).toBe(
      false,
    );
    expect(
      familyStatusFormSchema.safeParse({ reason: "Account requested pause" })
        .success,
    ).toBe(true);
  });

  test("keeps stable list and detail query keys", () => {
    expect(familyKeys.list({ limit: 25, offset: 50 })).toEqual([
      "families",
      "list",
      { limit: 25, offset: 50 },
    ]);
    expect(familyKeys.detail("family-1")).toEqual([
      "families",
      "detail",
      "family-1",
    ]);
  });
});
