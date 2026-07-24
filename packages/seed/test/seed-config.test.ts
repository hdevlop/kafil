import { describe, expect, it } from "bun:test";

import {
  validateAdminEmail,
  validateAdminPassword,
  validateAdminPasswordConfirmation,
  readDatabaseConfig,
  readSeedConfig,
  readSeedVerificationConfig,
} from "../src/seed-config";

describe("seed configuration", () => {
  it("reads and normalizes Kafil seed variables", () => {
    expect(
      readSeedConfig({
        DATABASE_URL: "postgresql://localhost/kafil",
        KAFIL_ADMIN_EMAIL: " Admin@Example.Test ",
        KAFIL_ADMIN_PASSWORD: "StrongPass1",
      }),
    ).toEqual({
      adminEmail: "admin@example.test",
      adminPassword: "StrongPass1",
      databaseUrl: "postgresql://localhost/kafil",
    });
  });

  it("accepts the SMS admin variable aliases", () => {
    expect(
      readSeedConfig({
        ADMIN_EMAIL: "admin@example.test",
        ADMIN_PASSWORD: "StrongPass1",
        DATABASE_URL: "postgresql://localhost/kafil",
      }).adminEmail,
    ).toBe("admin@example.test");
  });

  it("validates and normalizes admin email input", () => {
    expect(validateAdminEmail(" Admin@Example.Test ")).toBe(
      "admin@example.test",
    );
    expect(() => validateAdminEmail("")).toThrow("required");
    expect(() => validateAdminEmail("not-an-email")).toThrow(
      "valid email address",
    );
    expect(() =>
      validateAdminEmail(`${"a".repeat(243)}@example.test`),
    ).toThrow("at most 254");
  });

  it("validates admin passwords and exact confirmation", () => {
    expect(validateAdminPassword("StrongPass1")).toBe("StrongPass1");
    expect(() => validateAdminPassword("short")).toThrow(
      "at least 8 characters",
    );
    expect(() => validateAdminPassword("a".repeat(72) + "A1")).toThrow(
      "at most 72 characters",
    );
    expect(
      validateAdminPasswordConfirmation("StrongPass1", "StrongPass1"),
    ).toBe("StrongPass1");
    expect(() =>
      validateAdminPasswordConfirmation("StrongPass1", "StrongPass2"),
    ).toThrow("match exactly");
  });

  it("allows migration-only configuration without admin credentials", () => {
    expect(
      readDatabaseConfig({
        DATABASE_URL: "postgresql://localhost/kafil",
      }),
    ).toEqual({
      databaseUrl: "postgresql://localhost/kafil",
    });
  });

  it("allows verification without the admin password", () => {
    expect(
      readSeedVerificationConfig({
        DATABASE_URL: "postgresql://localhost/kafil",
        KAFIL_ADMIN_EMAIL: " Admin@Example.Test ",
      }),
    ).toEqual({
      adminEmail: "admin@example.test",
      databaseUrl: "postgresql://localhost/kafil",
    });
  });

  it("rejects missing database and weak admin credentials", () => {
    expect(() =>
      readSeedConfig({
        KAFIL_ADMIN_EMAIL: "admin@example.test",
        KAFIL_ADMIN_PASSWORD: "StrongPass1",
      }),
    ).toThrow("DATABASE_URL is required");
    expect(() =>
      readSeedConfig({
        DATABASE_URL: "postgresql://localhost/kafil",
        KAFIL_ADMIN_EMAIL: "admin@example.test",
        KAFIL_ADMIN_PASSWORD: "short",
      }),
    ).toThrow("at least 8 characters");
    expect(() =>
      readSeedConfig({
        DATABASE_URL: "postgresql://localhost/kafil",
        KAFIL_ADMIN_EMAIL: "admin@example.test",
        KAFIL_ADMIN_PASSWORD: "lowercase1",
      }),
    ).toThrow("uppercase letter");
    expect(() =>
      readSeedConfig({
        DATABASE_URL: "postgresql://localhost/kafil",
        KAFIL_ADMIN_EMAIL: "admin@example.test",
        KAFIL_ADMIN_PASSWORD: "UPPERCASE1",
      }),
    ).toThrow("lowercase letter");
    expect(() =>
      readSeedConfig({
        DATABASE_URL: "postgresql://localhost/kafil",
        KAFIL_ADMIN_EMAIL: "admin@example.test",
        KAFIL_ADMIN_PASSWORD: "NoNumbersHere",
      }),
    ).toThrow("one number");
  });
});
