import { describe, expect, it } from "bun:test";

import { createApplicantDto } from "../src/modules/applicants/applicantDto";

const validBody = {
  name: "Fatima Zahra",
  email: "fatima@example.test",
  phone: "+212600112233",
  cin: "AB123456",
  gender: "F" as const,
  password: "StrongPass1",
};

describe("applicant CIN DTO boundary (7..20 rule + friendly message)", () => {
  it("accepts 7-character CIN (lower boundary)", () => {
    expect(createApplicantDto.safeParse({ ...validBody, cin: "BC10110" }).success).toBe(true);
  });

  it("accepts 8-character CIN (just above lower boundary)", () => {
    expect(createApplicantDto.safeParse({ ...validBody, cin: "AB123456" }).success).toBe(true);
  });

  it("accepts 20-character CIN (upper boundary)", () => {
    expect(createApplicantDto.safeParse({ ...validBody, cin: "A".repeat(20) }).success).toBe(true);
  });

  it("rejects a 6-character CIN with the friendly message", () => {
    const result = createApplicantDto.safeParse({ ...validBody, cin: "A".repeat(6) });
    expect(result.success).toBe(false);
    if (!result.success) {
      const cinIssue = result.error.issues.find((i) => i.path.includes("cin"));
      expect(cinIssue?.message).toBe("CIN must be at least 7 characters");
    }
  });

  it("rejects a 21-character CIN with the friendly message", () => {
    const result = createApplicantDto.safeParse({ ...validBody, cin: "A".repeat(21) });
    expect(result.success).toBe(false);
    if (!result.success) {
      const cinIssue = result.error.issues.find((i) => i.path.includes("cin"));
      expect(cinIssue?.message).toBe("CIN must be at most 20 characters");
    }
  });

  it("uppercases the CIN after validation and preserves the 7..20 boundary", () => {
    const parsed = createApplicantDto.parse({ ...validBody, cin: "bc10110" });
    expect(parsed.cin).toBe("BC10110");
  });

  it("preserves the authoritative 7..20 range (server stays the source of truth)", () => {
    const result = createApplicantDto.safeParse({ ...validBody, cin: "A".repeat(6) });
    expect(result.success).toBe(false);
    const resultLong = createApplicantDto.safeParse({ ...validBody, cin: "A".repeat(21) });
    expect(resultLong.success).toBe(false);
    const resultOk = createApplicantDto.safeParse({ ...validBody, cin: "A".repeat(7) });
    expect(resultOk.success).toBe(true);
  });
});
