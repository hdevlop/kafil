import { email, emailConfigFromEnv } from "najm-email";

/**
 * Outgoing mail. EMAIL_PROVIDER is required: there is no silent default.
 * najm-email validates the values and logs a failed delivery with no
 * recipient details.
 *
 *   EMAIL_PROVIDER           console | memory | resend | sendgrid | smtp
 *   EMAIL_LOG_LEVEL          console: debug | info (default info)
 *   RESEND_API_KEY           resend
 *   SENDGRID_API_KEY         sendgrid
 *   SENDGRID_SANDBOX_MODE    sendgrid: 1 | true to accept mail without sending it
 *   SMTP_HOST, SMTP_PORT     smtp (port default 587)
 *   SMTP_USER, SMTP_PASS     smtp, both or neither
 *   SMTP_SECURE              smtp: 1 | true for implicit TLS
 *   EMAIL_DEFAULT_FROM
 *   EMAIL_DEFAULT_REPLY_TO
 *   EMAIL_DEBUG              1 | true
 *   EMAIL_RETRY_ATTEMPTS     default 1
 *   EMAIL_RETRY_DELAY        milliseconds, default 1000
 *
 * Each variable is read literally here so Next's production bundler keeps it.
 */
export const emailConfig = () =>
  email(emailConfigFromEnv({
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
    EMAIL_LOG_LEVEL: process.env.EMAIL_LOG_LEVEL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
    SENDGRID_SANDBOX_MODE: process.env.SENDGRID_SANDBOX_MODE,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_SECURE: process.env.SMTP_SECURE,
    EMAIL_DEFAULT_FROM: process.env.EMAIL_DEFAULT_FROM,
    EMAIL_DEFAULT_REPLY_TO: process.env.EMAIL_DEFAULT_REPLY_TO,
    EMAIL_DEBUG: process.env.EMAIL_DEBUG,
    EMAIL_RETRY_ATTEMPTS: process.env.EMAIL_RETRY_ATTEMPTS,
    EMAIL_RETRY_DELAY: process.env.EMAIL_RETRY_DELAY,
  }));
