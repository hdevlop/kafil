import { describe, expect, test } from "bun:test";

import { normalizePhone } from "@kafil/server/phone";
import { createFamilyGuardianStepSchema } from "../src/features/Families/config/familySchemas";
import {
  familyRelationshipItems,
  familyRelationshipLabel,
} from "../src/features/Families/config/relationshipOptions";

const translate = (key: string) => key;
const guardian = {
  name: "Amina Guardian",
  email: "amina@example.com",
  guardianCin: "AB123456",
  guardianDateOfBirth: "1987-03-12",
  relationshipToChildren: "mother",
};

describe("family guardian inputs", () => {
  test("phone validation follows the server and rejects a dial code alone", () => {
    for (const phone of ["+212600000001", "0600000001", "+33612345678"]) {
      expect(createFamilyGuardianStepSchema.safeParse({ ...guardian, phone }).success).toBe(
        normalizePhone(phone) !== null,
      );
    }
    for (const phone of ["", "+212", "0600", "not-a-phone"]) {
      expect(createFamilyGuardianStepSchema.safeParse({ ...guardian, phone }).success).toBe(
        false,
      );
    }
  });

  test("offers canonical values, an empty choice, and the stored legacy value", () => {
    const items = familyRelationshipItems(undefined, translate);
    expect(items.map((item) => item.value)).toEqual([
      "",
      "mother",
      "father",
      "grandmother",
      "grandfather",
      "aunt",
      "uncle",
      "sibling",
      "legalGuardian",
      "other",
    ]);
    expect(familyRelationshipItems("Step-mother", translate).at(-1)).toEqual({
      value: "Step-mother",
      label: "Step-mother",
    });
    expect(familyRelationshipItems("mother", translate)).toHaveLength(items.length);
  });

  test("translates canonical values without rewriting free text", () => {
    expect(familyRelationshipLabel("legalGuardian", translate)).toBe(
      "operator.families.relationshipOptions.legalGuardian",
    );
    expect(familyRelationshipLabel("Step-mother", translate)).toBe("Step-mother");
    expect(familyRelationshipLabel("", translate)).toBeNull();
  });
});
