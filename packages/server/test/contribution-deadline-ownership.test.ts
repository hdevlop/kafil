import { describe, expect, it } from "bun:test";

import { createContributionDto, recordContributionDto } from "../src/modules/contributions";

describe("contribution DTO deadline ownership", () => {
  it("rejects caller-supplied expiresAt on create", () => {
    const result = createContributionDto.safeParse({
      supportAssignmentId: "00000000-0000-4000-8000-000000000064",
      amountMinor: 1000,
      paymentMethod: "bank_transfer",
      expiresAt: "2030-01-01T00:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });

  it("rejects caller-supplied expiresAt on record", () => {
    const result = recordContributionDto.safeParse({
      supportAssignmentId: "00000000-0000-4000-8000-000000000064",
      amountMinor: 1000,
      paymentMethod: "bank_transfer",
      paidAt: "2026-07-18",
      expiresAt: "2030-01-01T00:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a create call without expiresAt", () => {
    const result = createContributionDto.safeParse({
      supportAssignmentId: "00000000-0000-4000-8000-000000000064",
      amountMinor: 1000,
      paymentMethod: "bank_transfer",
    });
    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty("expiresAt");
  });
});