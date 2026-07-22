import { describe, expect, it } from "bun:test";

import {
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
