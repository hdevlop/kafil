import { pool } from "@kafil/server/database";

import { readSeedConfig } from "../seed-config";
import { seedAuthentication } from "../seed-auth";

try {
  const config = readSeedConfig();
  await seedAuthentication(config.adminEmail, config.adminPassword, {
    verbose: false,
  });
  console.log("Auth seed reconciliation passed.");
} catch {
  process.exitCode = 1;
  console.error("Auth seed reconciliation failed.");
} finally {
  await pool.end();
}
