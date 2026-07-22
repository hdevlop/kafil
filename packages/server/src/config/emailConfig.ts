import { email } from "najm-email";

/**
 * Najm Email reads EMAIL_PROVIDER and provider-specific credentials from the
 * environment. Keeping the call argument-free preserves console delivery for
 * local development and lets production select SMTP, Resend, or another
 * published provider without changing application code.
 */
export const emailConfig = () => email();
