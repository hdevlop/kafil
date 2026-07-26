import {
  email,
  type EmailPluginConfig,
  type ProviderConfig,
} from "najm-email";

/**
 * Resolve the provider in application code so Next's production bundler does
 * not have to preserve dynamic environment reads inside najm-email.
 */
export const emailConfig = () => email(resolveEmailConfig());

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the configured email provider.`);
  return value;
}

function enabled(value: string | undefined) {
  return value === "1" || value?.toLowerCase() === "true";
}

function resolveProvider(): ProviderConfig {
  const provider = required("EMAIL_PROVIDER").toLowerCase();
  switch (provider) {
    case "console":
      return {
        provider: "console",
        logLevel: process.env.EMAIL_LOG_LEVEL === "debug" ? "debug" : "info",
      };
    case "memory":
      return { provider: "memory" };
    case "resend":
      return { provider: "resend", apiKey: required("RESEND_API_KEY") };
    case "sendgrid":
      return {
        provider: "sendgrid",
        apiKey: required("SENDGRID_API_KEY"),
        sandboxMode: enabled(process.env.SENDGRID_SANDBOX_MODE),
      };
    case "smtp": {
      const user = process.env.SMTP_USER?.trim();
      const pass = process.env.SMTP_PASS?.trim();
      const port = Number(process.env.SMTP_PORT ?? 587);
      if (Boolean(user) !== Boolean(pass)) {
        throw new Error("SMTP_USER and SMTP_PASS must be configured together.");
      }
      if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
        throw new Error("SMTP_PORT must be a whole number between 1 and 65535.");
      }
      return {
        provider: "smtp",
        host: required("SMTP_HOST"),
        port,
        secure: enabled(process.env.SMTP_SECURE),
        auth: user && pass ? { user, pass } : undefined,
      };
    }
    default:
      throw new Error(`Unsupported EMAIL_PROVIDER '${provider}'.`);
  }
}

function resolveEmailConfig(): EmailPluginConfig {
  const attempts = Number(process.env.EMAIL_RETRY_ATTEMPTS ?? 1);
  const delay = Number(process.env.EMAIL_RETRY_DELAY ?? 1_000);
  return {
    provider: resolveProvider(),
    defaultFrom: process.env.EMAIL_DEFAULT_FROM,
    defaultReplyTo: process.env.EMAIL_DEFAULT_REPLY_TO,
    debug: enabled(process.env.EMAIL_DEBUG),
    retry: {
      attempts: Number.isSafeInteger(attempts) && attempts > 0 ? attempts : 1,
      delay: Number.isFinite(delay) && delay >= 0 ? delay : 1_000,
    },
  };
}
