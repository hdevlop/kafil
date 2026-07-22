import { describe, expect, test } from "bun:test";

import {
  createSupportAssignmentFormSchema,
  endSupportAssignmentFormSchema,
  toCreateSupportAssignmentInput,
  toUpdateSupportAssignmentNotesInput,
  updateSupportAssignmentNotesFormSchema,
} from "../src/features/SupportAssignments/config/supportAssignmentSchemas";
import { supportAssignmentKeys } from "../src/features/SupportAssignments/hooks/supportAssignmentKeys";

const sponsorProfileId = "00000000-0000-4000-8000-000000000001";
const familyProfileId = "00000000-0000-4000-8000-000000000002";

describe("Phase 6C support assignment forms", () => {
  test("creates a sponsor-to-family relationship without client lifecycle fields", () => {
    const values = createSupportAssignmentFormSchema.parse({
      sponsorProfileId,
      familyProfileId,
      notes: "  Monthly support  ",
    });

    const input = toCreateSupportAssignmentInput(values);

    expect(input).toEqual({
      sponsorProfileId,
      familyProfileId,
      notes: "Monthly support",
    });
    expect(input).not.toHaveProperty("status");
    expect(input).not.toHaveProperty("assignedByUserId");
    expect(input).not.toHaveProperty("childId");
  });

  test("requires the sponsor and family identifiers", () => {
    expect(
      createSupportAssignmentFormSchema.safeParse({
        sponsorProfileId: "",
        familyProfileId: "",
      }).success,
    ).toBe(false);
  });

  test("does not accept a child target in the family-only form", () => {
    expect(
      createSupportAssignmentFormSchema.safeParse({
        sponsorProfileId,
        familyProfileId,
        childId: "00000000-0000-4000-8000-000000000003",
      }).success,
    ).toBe(false);
  });

  test("updates only operator notes and permits clearing them", () => {
    const values = updateSupportAssignmentNotesFormSchema.parse({
      notes: "  Updated for the next review  ",
    });

    expect(
      toUpdateSupportAssignmentNotesInput("assignment-1", values),
    ).toEqual({ id: "assignment-1", notes: "Updated for the next review" });
    expect(
      toUpdateSupportAssignmentNotesInput(
        "assignment-1",
        updateSupportAssignmentNotesFormSchema.parse({ notes: " " }),
      ),
    ).toEqual({ id: "assignment-1", notes: null });
  });
});

describe("Phase 6C support assignment lifecycle contracts", () => {
  test("requires an audited end reason", () => {
    expect(endSupportAssignmentFormSchema.safeParse({ reason: "" }).success).toBe(false);
    expect(
      endSupportAssignmentFormSchema.safeParse({ reason: "Support changed" })
        .success,
    ).toBe(true);
  });

  test("keeps stable list and detail query keys", () => {
    expect(supportAssignmentKeys.list({ limit: 25, offset: 50 })).toEqual([
      "support-assignments",
      "list",
      { limit: 25, offset: 50 },
    ]);
    expect(supportAssignmentKeys.detail("assignment-1")).toEqual([
      "support-assignments",
      "detail",
      "assignment-1",
    ]);
  });
});
