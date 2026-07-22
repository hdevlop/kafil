export interface SeedConfig {
  adminEmail: string;
  adminPassword: string;
  databaseUrl: string;
}

export interface SeedVerificationConfig {
  adminEmail: string;
  databaseUrl: string;
}

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
  const adminEmail = required(
    env,
    "KAFIL_ADMIN_EMAIL",
    "ADMIN_EMAIL",
  )
    .trim()
    .toLowerCase();
  const adminPassword = required(
    env,
    "KAFIL_ADMIN_PASSWORD",
    "ADMIN_PASSWORD",
  );

  if (adminPassword.length < 8) {
    throw new Error(
      "KAFIL_ADMIN_PASSWORD must contain at least 8 characters.",
    );
  }
  if (!/[A-Z]/.test(adminPassword)) {
    throw new Error(
      "KAFIL_ADMIN_PASSWORD must contain at least one uppercase letter. Family easy-password rules do not apply to the bootstrap admin.",
    );
  }
  if (!/[a-z]/.test(adminPassword)) {
    throw new Error(
      "KAFIL_ADMIN_PASSWORD must contain at least one lowercase letter.",
    );
  }
  if (!/\d/.test(adminPassword)) {
    throw new Error(
      "KAFIL_ADMIN_PASSWORD must contain at least one number.",
    );
  }

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
  const adminEmail = required(
    env,
    "KAFIL_ADMIN_EMAIL",
    "ADMIN_EMAIL",
  )
    .trim()
    .toLowerCase();

  return { adminEmail, databaseUrl };
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
