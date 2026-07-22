import { describe, expect, test } from "bun:test";

import {
  contributionReasonFormSchema,
  currentContributionDate,
  recordContributionFormSchema,
  toRecordContributionInput,
  toContributionReasonInput,
} from "../src/features/Contributions/config/contributionSchemas";
import { buildContributionRecordingOptions } from "../src/features/Contributions/config/contributionRecordingOptions";
import { contributionInvalidation } from "../src/features/Contributions/hooks/contributionInvalidation";
import { contributionKeys } from "../src/features/Contributions/hooks/contributionKeys";

describe("Phase 6D contribution command contracts", () => {
  test("requires an audited reason for rejection and refund", () => {
    expect(contributionReasonFormSchema.safeParse({ reason: "" }).success).toBe(
      false,
    );
    expect(
      contributionReasonFormSchema.safeParse({ reason: "  Duplicate payment  " })
        .success,
    ).toBe(true);
  });

  test("normalizes a command reason without client-controlled status fields", () => {
    const values = contributionReasonFormSchema.parse({
      reason: "  Duplicate payment  ",
    });

    expect(
      toContributionReasonInput("contribution-1", values),
    ).toEqual({ id: "contribution-1", reason: "Duplicate payment" });
  });

  test("normalizes an operator-recorded offline payment into minor units", () => {
    const values = recordContributionFormSchema.parse({
      supportAssignmentId: "00000000-0000-4000-8000-000000000064",
      amountMad: "125,50",
      paymentMethod: "bank_transfer",
      paidOn: "2026-07-18",
      externalReference: " BANK-42 ",
    });

    expect(toRecordContributionInput(values)).toEqual({
      supportAssignmentId: "00000000-0000-4000-8000-000000000064",
      amountMinor: 12550,
      paymentMethod: "bank_transfer",
      paidAt: "2026-07-18",
      externalReference: "BANK-42",
    });
    expect(currentContributionDate(new Date(2026, 6, 19))).toBe("2026-07-19");
  });

  test("keeps stable contribution list and detail query keys", () => {
    expect(contributionKeys.list({ limit: 25, offset: 50 })).toEqual([
      "contributions",
      "list",
      { limit: 25, offset: 50 },
    ]);
    expect(contributionKeys.detail("contribution-1")).toEqual([
      "contributions",
      "detail",
      "contribution-1",
    ]);
    expect(contributionKeys.recordingOptions).toEqual([
      "contributions",
      "recording-options",
    ]);
  });

  test("limits budget recording options to sponsors of the selected family", () => {
    const assignments = [
      {
        id: "assignment-1",
        sponsorProfileId: "sponsor-1",
        familyProfileId: "family-1",
        sponsorName: "Sponsor One",
        sponsorEmail: "one@example.com",
        familyName: "Family One",
      },
      {
        id: "assignment-2",
        sponsorProfileId: "sponsor-2",
        familyProfileId: "family-2",
        sponsorName: "Sponsor Two",
        sponsorEmail: "two@example.com",
        familyName: "Family Two",
      },
    ];

    expect(buildContributionRecordingOptions(assignments, "family-1")).toEqual([
      {
        value: "assignment-1",
        label: "Sponsor One (one@example.com)",
      },
    ]);
    expect(buildContributionRecordingOptions(assignments)).toEqual([
      {
        value: "assignment-1",
        label: "Sponsor One — Family One (one@example.com)",
      },
      {
        value: "assignment-2",
        label: "Sponsor Two — Family Two (two@example.com)",
      },
    ]);
  });

  test("refreshes family funding after financial contribution mutations", () => {
    expect(contributionInvalidation.contribution).toEqual([
      ["contributions"],
    ]);
    expect(contributionInvalidation.financial).toEqual([
      ["contributions"],
      ["budgets"],
      ["families"],
    ]);
  });
});
