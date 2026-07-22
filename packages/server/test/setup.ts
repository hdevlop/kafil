process.env.EMAIL_PROVIDER ??= "memory";
process.env.FRONTEND_URL ??= "http://localhost:3000";
process.env.JWT_ACCESS_SECRET ??= "test-access-secret-that-is-at-least-32-chars";
process.env.JWT_REFRESH_SECRET ??=
  "test-refresh-secret-that-is-at-least-32-chars";
process.env.NAJM_ENCRYPTION_KEY ??= "11".repeat(32);
