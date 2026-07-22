import { hash } from "bcryptjs";
import { inArray } from "drizzle-orm";

import { db, pool, rolesTable, usersTable } from "@kafil/server/database";
import { phase6BrowserPassword, phase6BrowserUsers } from "./phase6-e2e-fixtures";

export async function preparePhase6BrowserUsers() {
  const password = await hash(phase6BrowserPassword, 12);
  const roles = await db
    .select({ id: rolesTable.id, name: rolesTable.name })
    .from(rolesTable)
    .where(inArray(rolesTable.name, Object.keys(phase6BrowserUsers)));

  for (const [roleName, email] of Object.entries(phase6BrowserUsers)) {
    const role = roles.find((entry) => entry.name === roleName);
    if (!role) throw new Error(`Missing seeded '${roleName}' role for browser tests.`);

    await db
      .insert(usersTable)
      .values({
        email,
        emailVerified: true,
        id: `phase6_browser_${roleName}`,
        name: `Phase 6 browser ${roleName}`,
        password,
        roleId: role.id,
        status: "active",
      })
      .onConflictDoUpdate({
        target: usersTable.email,
        set: {
          emailVerified: true,
          name: `Phase 6 browser ${roleName}`,
          password,
          roleId: role.id,
          status: "active",
        },
      });
  }

  console.log("Prepared isolated Phase 6 browser users.");
}

if (import.meta.main) {
  await preparePhase6BrowserUsers();
  await pool.end();
}
