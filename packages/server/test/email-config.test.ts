import { describe, expect, it } from "bun:test";

import { emailConfig } from "../src/config/emailConfig";

type Variables = Partial<Record<
  "EMAIL_PROVIDER" | "EMAIL_DEFAULT_FROM" | "EMAIL_RETRY_ATTEMPTS" | "SMTP_HOST" | "SMTP_PORT" | "SMTP_USER" | "SMTP_PASS",
  string
>>;

function withEmailEnvironment(values: Variables, run: () => void) {
  const names = Object.keys(values) as (keyof Variables)[];
  const originals = new Map(names.map((name) => [name, process.env[name]]));
  try {
    for (const name of names) {
      const value = values[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    run();
  } finally {
    for (const name of names) {
      const value = originals.get(name);
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

const config = () => emailConfig().config as {
  provider: { provider: string };
  defaultFrom?: string;
  retry: { attempts: number; delay: number };
};

describe("Kafil email config", () => {
  it("requires EMAIL_PROVIDER: there is no silent default", () => {
    withEmailEnvironment({ EMAIL_PROVIDER: undefined }, () => {
      expect(() => emailConfig()).toThrow("EMAIL_PROVIDER is required");
    });
  });

  it("uses the configured sender and has no fallback of its own", () => {
    withEmailEnvironment({ EMAIL_PROVIDER: "memory", EMAIL_DEFAULT_FROM: "Kafil <no-reply@kafil.invalid>" }, () => {
      expect(config()).toMatchObject({ provider: { provider: "memory" }, defaultFrom: "Kafil <no-reply@kafil.invalid>" });
    });
    withEmailEnvironment({ EMAIL_PROVIDER: "memory", EMAIL_DEFAULT_FROM: " " }, () => {
      expect(config().defaultFrom).toBeUndefined();
    });
  });

  it("stops startup on malformed values instead of falling back", () => {
    withEmailEnvironment({ EMAIL_PROVIDER: "memory", EMAIL_RETRY_ATTEMPTS: "abc" }, () => {
      expect(() => emailConfig()).toThrow("EMAIL_RETRY_ATTEMPTS must be an integer 1 or more.");
    });
    withEmailEnvironment({ EMAIL_PROVIDER: "smtp", SMTP_HOST: "mail.local", SMTP_PORT: "abc" }, () => {
      expect(() => emailConfig()).toThrow("SMTP_PORT must be an integer from 1 to 65535.");
    });
    withEmailEnvironment({ EMAIL_PROVIDER: "smtp", SMTP_HOST: "mail.local", SMTP_USER: "u", SMTP_PASS: undefined }, () => {
      expect(() => emailConfig()).toThrow("SMTP_USER and SMTP_PASS must be configured together.");
    });
  });
});
