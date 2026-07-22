import { inArray } from "drizzle-orm";

import { db, pool, usersTable } from "@kafil/server/database";

import { phase6BrowserUsers } from "./phase6-e2e-fixtures";

export async function removePhase6BrowserUsers() {
  await db
    .delete(usersTable)
    .where(inArray(usersTable.email, Object.values(phase6BrowserUsers)));

  console.log("Removed isolated Phase 6 browser users.");
}

if (import.meta.main) {
  await removePhase6BrowserUsers();
  await pool.end();
}
