import { cancel, intro, isCancel, outro, password, select } from "@clack/prompts";
import { server } from "@kafil/server";
import {
  db,
  pool,
  rolesTable,
  sponsorProfiles,
  staffFunctions,
  staffProfiles,
  usersTable,
} from "@kafil/server/database";
import { and, asc, eq, like, or } from "drizzle-orm";
import { TokenService, UserService } from "najm-auth";

import {
  assertDemoAccessEnvironment,
  DEMO_EMAIL_SUFFIX,
  isDemoAccessAccount,
  validateDemoAccessPassword,
  type DemoAccessAccount,
} from "../demo-access";

async function main() {
  assertDemoAccessEnvironment();
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(
      "Demo access requires an interactive terminal so the password stays out of command history.",
    );
  }

  intro("Kafil demo account access");
  await server.init();
  const accounts = await listDemoAccessAccounts();
  if (accounts.length === 0) {
    throw new Error(
      `No linked sponsor or delivery accounts ending in '${DEMO_EMAIL_SUFFIX}' were found. Run the demo seed first.`,
    );
  }

  const userId = await select<string>({
    message: "Choose a demo account",
    options: accounts.map((account) => ({
      value: account.id,
      label: `${account.email} (${account.role})`,
      hint: account.name ?? undefined,
    })),
  });
  if (isCancel(userId)) return cancelAccess();

  const newPassword = await password({
    message: "New password",
    clearOnError: true,
    validate: (value) => validationMessage(() =>
      validateDemoAccessPassword(value, value),
    ),
  });
  if (isCancel(newPassword)) return cancelAccess();

  const confirmation = await password({
    message: "Confirm new password",
    clearOnError: true,
    validate: (value) => validationMessage(() =>
      validateDemoAccessPassword(newPassword, value),
    ),
  });
  if (isCancel(confirmation)) return cancelAccess();

  const selected = accounts.find((account) => account.id === userId)!;
  const users = server.container.get(UserService);
  const tokens = server.container.get(TokenService);
  await users.update(selected.id, {
    emailVerified: true,
    password: validateDemoAccessPassword(newPassword, confirmation),
    status: "active",
  });
  // Supersede any invitation/reset jti still cached for this user. The newly
  // generated token is deliberately discarded and expires automatically.
  await tokens.generateResetToken(selected.id);

  outro(`Access restored for ${selected.email}. Sign in with the new password.`);
}

async function listDemoAccessAccounts(): Promise<DemoAccessAccount[]> {
  const rows = await db
    .select({
      email: usersTable.email,
      id: usersTable.id,
      name: usersTable.name,
      role: rolesTable.name,
      sponsorProfileId: sponsorProfiles.id,
      staffProfileId: staffProfiles.id,
    })
    .from(usersTable)
    .innerJoin(rolesTable, eq(rolesTable.id, usersTable.roleId))
    .leftJoin(sponsorProfiles, eq(sponsorProfiles.userId, usersTable.id))
    .leftJoin(
      staffProfiles,
      and(
        eq(staffProfiles.userId, usersTable.id),
        eq(staffProfiles.status, "active"),
      ),
    )
    .leftJoin(
      staffFunctions,
      and(
        eq(staffFunctions.staffProfileId, staffProfiles.id),
        eq(staffFunctions.functionKey, "delivery"),
      ),
    )
    .where(
      and(
        like(usersTable.email, `%${DEMO_EMAIL_SUFFIX}`),
        or(
          eq(rolesTable.name, "sponsor"),
          and(eq(rolesTable.name, "delivery"), eq(staffFunctions.functionKey, "delivery")),
        ),
      ),
    )
    .orderBy(asc(rolesTable.name), asc(usersTable.email));

  return rows.filter(isDemoAccessAccount).map((row) => ({
    email: row.email,
    id: row.id,
    name: row.name,
    role: row.role as DemoAccessAccount["role"],
  }));
}

function validationMessage(validate: () => unknown) {
  try {
    validate();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

function cancelAccess() {
  cancel("Demo access cancelled; no data was changed.");
  return undefined;
}

try {
  await main();
} catch (error) {
  process.exitCode = 1;
  console.error(error instanceof Error ? error.message : String(error));
} finally {
  await pool.end();
}
