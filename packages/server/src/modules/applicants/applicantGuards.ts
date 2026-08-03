/**
 * Applicant routes are intentionally public. The credential-setup cookie
 * established by `POST /api/applicants` is the only owner of an in-flight
 * verification, and Najm's `CredentialSetupService.require` enforces it on
 * the setup, resend, confirm, and status endpoints.
 *
 * No Kafil role guard is applied to the public form. The admin review queue
 * will be added by the parent sponsor workflow and will reuse the existing
 * operator/admin guards.
 */
export {};
