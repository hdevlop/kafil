export interface SeedConfig {
  adminEmail: string;
  adminPassword: string;
  databaseUrl: string;
}

export interface SeedVerificationConfig {
  adminEmail: string;
  databaseUrl: string;
}

const ADMIN_EMAIL_MAX_LENGTH = 254;
const ADMIN_PASSWORD_MIN_LENGTH = 8;
const ADMIN_PASSWORD_MAX_LENGTH = 72;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function readDatabaseConfig(
  env: Record<string, string | undefined> = process.env,
) {
  return {
    databaseUrl: required(env, "DATABASE_URL"),
  };
}

export function readSeedConfig(
  env: Record<string, string | undefined> = process.env,
): SeedConfig {
  const { databaseUrl } = readDatabaseConfig(env);
  const adminEmail = validateAdminEmail(
    env.KAFIL_ADMIN_EMAIL ?? env.ADMIN_EMAIL,
  );
  const adminPassword = validateAdminPassword(
    env.KAFIL_ADMIN_PASSWORD ?? env.ADMIN_PASSWORD,
  );

  return {
    adminEmail,
    adminPassword,
    databaseUrl,
  };
}

export function readSeedVerificationConfig(
  env: Record<string, string | undefined> = process.env,
): SeedVerificationConfig {
  const { databaseUrl } = readDatabaseConfig(env);
  const adminEmail = validateAdminEmail(
    env.KAFIL_ADMIN_EMAIL ?? env.ADMIN_EMAIL,
  );

  return { adminEmail, databaseUrl };
}

export function normalizeAdminEmail(value: string) {
  return value.trim().toLowerCase();
}

export function validateAdminEmail(value: string | undefined) {
  const email = normalizeAdminEmail(value ?? "");
  if (!email) {
    throw new Error("Admin email is required.");
  }
  if (email.length > ADMIN_EMAIL_MAX_LENGTH) {
    throw new Error(
      `Admin email must contain at most ${ADMIN_EMAIL_MAX_LENGTH} characters.`,
    );
  }
  if (!EMAIL_PATTERN.test(email)) {
    throw new Error("Admin email must be a valid email address.");
  }
  return email;
}

export function validateAdminPassword(value: string | undefined) {
  const password = value ?? "";
  if (!password) {
    throw new Error("Admin password is required.");
  }
  if (password.length < ADMIN_PASSWORD_MIN_LENGTH) {
    throw new Error(
      `Admin password must contain at least ${ADMIN_PASSWORD_MIN_LENGTH} characters.`,
    );
  }
  if (password.length > ADMIN_PASSWORD_MAX_LENGTH) {
    throw new Error(
      `Admin password must contain at most ${ADMIN_PASSWORD_MAX_LENGTH} characters because bcrypt ignores longer input.`,
    );
  }
  if (!/[A-Z]/.test(password)) {
    throw new Error(
      "Admin password must contain at least one uppercase letter. Family easy-password rules do not apply to the bootstrap admin.",
    );
  }
  if (!/[a-z]/.test(password)) {
    throw new Error(
      "Admin password must contain at least one lowercase letter.",
    );
  }
  if (!/\d/.test(password)) {
    throw new Error("Admin password must contain at least one number.");
  }
  return password;
}

export function validateAdminPasswordConfirmation(
  password: string,
  confirmation: string | undefined,
) {
  if (confirmation !== password) {
    throw new Error("Admin password confirmation must match exactly.");
  }
  return confirmation;
}

function required(
  env: Record<string, string | undefined>,
  name: string,
  alias?: string,
) {
  const value = env[name] ?? (alias ? env[alias] : undefined);
  if (!value?.trim()) {
    const aliasMessage = alias ? ` (or ${alias})` : "";
    throw new Error(`${name}${aliasMessage} is required.`);
  }

  return value;
}
