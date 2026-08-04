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

describe("applicant CIN DTO boundary (8..20 rule + friendly message)", () => {
  it("accepts 8-character CIN (lower boundary)", () => {
    expect(createApplicantDto.safeParse({ ...validBody, cin: "AB123456" }).success).toBe(true);
  });

  it("accepts 9-character CIN (just above lower boundary)", () => {
    expect(createApplicantDto.safeParse({ ...validBody, cin: "AB1234567" }).success).toBe(true);
  });

  it("accepts 20-character CIN (upper boundary)", () => {
    expect(createApplicantDto.safeParse({ ...validBody, cin: "A".repeat(20) }).success).toBe(true);
  });

  it("rejects a 7-character CIN with the friendly message", () => {
    const result = createApplicantDto.safeParse({ ...validBody, cin: "A".repeat(7) });
    expect(result.success).toBe(false);
    if (!result.success) {
      const cinIssue = result.error.issues.find((i) => i.path.includes("cin"));
      expect(cinIssue?.message).toBe("CIN must be at least 8 characters");
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

  it("uppercases the CIN after validation and preserves the 8..20 boundary", () => {
    const parsed = createApplicantDto.parse({ ...validBody, cin: "ab123456" });
    expect(parsed.cin).toBe("AB123456");
  });

  it("preserves the authoritative 8..20 range (server stays the source of truth)", () => {
    const result = createApplicantDto.safeParse({ ...validBody, cin: "A".repeat(7) });
    expect(result.success).toBe(false);
    const resultLong = createApplicantDto.safeParse({ ...validBody, cin: "A".repeat(21) });
    expect(resultLong.success).toBe(false);
    const resultOk = createApplicantDto.safeParse({ ...validBody, cin: "A".repeat(8) });
    expect(resultOk.success).toBe(true);
  });
});