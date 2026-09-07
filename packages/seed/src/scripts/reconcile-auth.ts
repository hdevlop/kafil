import { pool } from "@kafil/server/database";

import { reconcileAuthorizationSeed } from "../seed-auth";

try {
  await reconcileAuthorizationSeed();
  console.log("Auth seed reconciliation passed.");
} catch {
  process.exitCode = 1;
  console.error("Auth seed reconciliation failed.");
} finally {
  await pool.end();
}
