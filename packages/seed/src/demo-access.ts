export const DEMO_EMAIL_SUFFIX = "@demo.kafil.test";

export type DemoAccessRole = "delivery" | "sponsor";

export interface DemoAccessAccount {
  email: string;
  id: string;
  name: string | null;
  role: DemoAccessRole;
}

export function assertDemoAccessEnvironment(
  env: Record<string, string | undefined> = process.env,
) {
  if (env.NODE_ENV?.trim().toLowerCase() === "production") {
    throw new Error("Demo access is disabled in production.");
  }
}

export function isDemoAccessAccount(account: {
  email: string;
  role: string | null;
  sponsorProfileId: string | null;
  staffProfileId: string | null;
}) {
  const email = account.email.trim().toLowerCase();
  if (!email.endsWith(DEMO_EMAIL_SUFFIX)) return false;
  if (account.role === "sponsor") return account.sponsorProfileId !== null;
  if (account.role === "delivery") return account.staffProfileId !== null;
  return false;
}

export function validateDemoAccessPassword(
  password: string | undefined,
  confirmation: string | undefined,
) {
  const value = password ?? "";
  if (!value) throw new Error("Password is required.");
  if (value.length < 8) {
    throw new Error("Password must contain at least 8 characters.");
  }
  if (value.length > 72) {
    throw new Error(
      "Password must contain at most 72 characters because bcrypt ignores longer input.",
    );
  }
  if (!/[A-Z]/u.test(value)) {
    throw new Error("Password must contain at least one uppercase letter.");
  }
  if (!/[a-z]/u.test(value)) {
    throw new Error("Password must contain at least one lowercase letter.");
  }
  if (!/\d/u.test(value)) {
    throw new Error("Password must contain at least one number.");
  }
  if (confirmation !== value) {
    throw new Error("Password confirmation must match exactly.");
  }
  return value;
}
