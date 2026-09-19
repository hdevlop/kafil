import { pool } from "@kafil/server/database";

export async function runSeedCommand(
  label: string,
  task: () => Promise<void>,
) {
  console.log(`Starting ${label}...`);

  try {
    await task();
    console.log(`${label} completed successfully.`);
  } catch (error) {
    process.exitCode = 1;
    console.error(
      `${label} failed:`,
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    await pool.end();
  }
}

export function printVerification(
  verification: {
    admin: { email: string };
    permissionCount: number;
    roles: Array<{ name: string; permissionCount: number }>;
  },
) {
  for (const line of verificationLines(verification)) {
    console.log(line);
  }
}

export function verificationLines(
  verification: {
    admin: { email: string };
    permissionCount: number;
    roles: Array<{ name: string; permissionCount: number }>;
  },
) {
  return [
    "Admin: active verified admin",
    `Permissions: ${verification.permissionCount}`,
    ...verification.roles.map(
      (role) => `Role ${role.name}: ${role.permissionCount} permissions`,
    ),
  ];
}
