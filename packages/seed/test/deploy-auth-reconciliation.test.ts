import { readdirSync, readFileSync } from "node:fs";

import { describe, expect, it } from "bun:test";

const deploySource = readFileSync(
  new URL("../../../scripts/deployVps.sh", import.meta.url),
  "utf8",
);
const composeSource = readFileSync(
  new URL("../../../compose.production.yml", import.meta.url),
  "utf8",
).replace(/\r\n/g, "\n");
const workspacePackage = JSON.parse(
  readFileSync(new URL("../../../package.json", import.meta.url), "utf8"),
) as { scripts: Record<string, string> };
const seedPackage = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { scripts: Record<string, string> };
const reconciliationSource = readFileSync(
  new URL("../src/scripts/reconcile-auth.ts", import.meta.url),
  "utf8",
);
const seedAuthSource = readFileSync(
  new URL("../src/seed-auth.ts", import.meta.url),
  "utf8",
);
const authorizationSource = readFileSync(
  new URL("../src/authorization-reconciliation.ts", import.meta.url),
  "utf8",
);
const migrationsDirectory = new URL(
  "../../server/migrations/",
  import.meta.url,
);

describe("VPS auth grant reconciliation", () => {
  it("reconciles and verifies code-managed permissions before replacing the app", () => {
    const migration = deploySource.indexOf(
      '"${compose[@]}" --profile tools run --rm migrate',
    );
    const authSeed = deploySource.indexOf(
      '"${compose[@]}" --profile tools run --rm auth-reconcile',
    );
    const appReplacement = deploySource.indexOf(
      '"${compose[@]}" up -d --no-deps app',
    );

    expect(migration).toBeGreaterThan(-1);
    expect(authSeed).toBeGreaterThan(migration);
    expect(appReplacement).toBeGreaterThan(authSeed);
    expect(deploySource).toContain("run --rm auth-reconcile");
    expect(deploySource).toContain('>"${auth_seed_log}" 2>&1');
    expect(deploySource).toContain("Auth seed reconciliation failed");
    expect(deploySource).toContain("auth_seed_log_sha256");
  });

  it("stops the deployment when reconciliation fails instead of replacing the app", () => {
    const failure = deploySource.indexOf(
      "Auth seed reconciliation failed; the running application was not replaced.",
    );
    const appReplacement = deploySource.indexOf(
      '"${compose[@]}" up -d --no-deps app',
    );

    expect(failure).toBeGreaterThan(-1);
    expect(failure).toBeLessThan(appReplacement);
    expect(deploySource.slice(failure, failure + 200)).toContain("exit 7");
  });

  it("protects deployment logs from other local users", () => {
    expect(deploySource).toContain("umask 077");
  });

  it("provides an image-local quiet reconciliation service for orchestrated deploys", () => {
    expect(seedPackage.scripts["seed:reconcile-auth"]).toContain(
      "src/scripts/reconcile-auth.ts",
    );
    expect(workspacePackage.scripts["seed:reconcile-auth"]).toContain(
      "packages/seed",
    );

    const serviceStart = composeSource.indexOf("  auth-reconcile:");
    const serviceEnd = composeSource.indexOf(
      "\n  notifications-worker:",
      serviceStart,
    );
    expect(serviceStart).toBeGreaterThanOrEqual(0);
    expect(serviceEnd).toBeGreaterThan(serviceStart);
    const service = composeSource.slice(serviceStart, serviceEnd);
    expect(service).toContain("profiles: [tools]");
    expect(service).toContain('command: ["bun", "run", "seed:reconcile-auth"]');
    expect(service).toContain("      - backend");
    expect(service).not.toContain("      - frontend");
    expect(service).not.toContain("ports:");

    expect(deploySource).toContain("pull app migrate auth-reconcile notifications-worker");
    expect(deploySource).toContain(
      '"${compose[@]}" --profile tools run --rm auth-reconcile',
    );
  });

  it("waits for both PostgreSQL and Redis before repairing sessions", () => {
    const serviceStart = composeSource.indexOf("  auth-reconcile:");
    const serviceEnd = composeSource.indexOf(
      "\n  notifications-worker:",
      serviceStart,
    );
    const service = composeSource.slice(serviceStart, serviceEnd);

    expect(service).toContain("postgres:\n        condition: service_healthy");
    expect(service).toContain("redis:\n        condition: service_healthy");
  });

  it("keeps one transactional owner of fixed roles, permissions, and grants", () => {
    expect(seedAuthSource).toContain("reconcileAuthorizationSeed");
    expect(seedAuthSource).toContain("verifyAuthorizationSeed");
    expect(authorizationSource).toContain("pg_advisory_xact_lock");
    expect(authorizationSource).toContain("AUTH_ROLES");
    expect(authorizationSource).toContain("AUTH_PERMISSIONS");
    expect(authorizationSource).toContain("AUTH_ROLE_PERMISSIONS");

    // One algorithm only. A second grant synchronizer is how full setup,
    // deployment, and verification drifted into three answers.
    expect(seedAuthSource).not.toContain("syncRolePermissions");
    expect(authorizationSource).not.toContain("syncRolePermissions");
  });

  it("never clears working grants before the fallible Najm auth seed", () => {
    expect(seedAuthSource).not.toContain("clearManagedRolePermissions");

    const repair = seedAuthSource.indexOf("await reconcileAuthorizationSeed");
    const najmSeed = seedAuthSource.indexOf("await seedAuthData(");
    const finalRepair = seedAuthSource.lastIndexOf(
      "await reconcileAuthorizationSeed",
    );
    const verification = seedAuthSource.indexOf(
      "await verifyAuthenticationSeed(adminEmail)",
    );

    expect(repair).toBeGreaterThan(-1);
    expect(najmSeed).toBeGreaterThan(repair);
    expect(finalRepair).toBeGreaterThan(najmSeed);
    expect(verification).toBeGreaterThan(finalRepair);
  });

  it("keeps the reconciliation owner identity-free apart from the role reference", () => {
    expect(authorizationSource).not.toContain("adminEmail");
    expect(authorizationSource).not.toContain("adminPassword");
    expect(authorizationSource).not.toContain("tokensTable");

    // users.role_id is the one identity-adjacent column consolidation may move.
    expect(authorizationSource).toContain("usersTable.roleId");
    for (const identityColumn of [
      "usersTable.email",
      "usersTable.password",
      "usersTable.status",
      "usersTable.emailVerified",
      "usersTable.name",
    ]) {
      expect(authorizationSource).not.toContain(identityColumn);
    }
  });

  it("invalidates repaired sessions through Najm Auth rather than an ad hoc token update", () => {
    expect(reconciliationSource).toContain('from "najm-auth"');
    expect(reconciliationSource).toContain("TokenService");
    expect(reconciliationSource).toContain("invalidateUserAccessTokens");
    expect(reconciliationSource).toContain("revokeAllForUser");
    expect(reconciliationSource).not.toContain("tokensTable");
  });

  it("keeps the deployment command free of admin credentials and sanitized", () => {
    expect(reconciliationSource).toContain("reconcileAuthorizationSeed");
    expect(reconciliationSource).toContain("describeRepair");
    expect(reconciliationSource).not.toContain("readSeedConfig");
    expect(reconciliationSource).not.toContain("adminEmail");
    expect(reconciliationSource).not.toContain("adminPassword");
    expect(reconciliationSource).toContain(
      'console.error("Auth seed reconciliation failed.")',
    );
    expect(reconciliationSource).not.toContain("printVerification");
    expect(reconciliationSource).not.toContain("error instanceof Error");
    expect(reconciliationSource).not.toContain("userIds.join");
    expect(reconciliationSource).not.toContain("JSON.stringify");
  });

  it("ships Release B with a fail-closed role-name uniqueness migration", () => {
    const statements = readdirSync(migrationsDirectory)
      .filter((file) => file.endsWith(".sql"))
      .map((file) =>
        readFileSync(new URL(file, migrationsDirectory), "utf8").toLowerCase(),
      )
      .join("\n");

    expect(statements).toContain(
      "cannot create roles_name_unique; duplicate role names:",
    );
    expect(statements).toContain(
      'create unique index "roles_name_unique" on "roles" using btree ("name")',
    );
    expect(statements.indexOf("cannot create roles_name_unique")).toBeLessThan(
      statements.indexOf('create unique index "roles_name_unique"'),
    );
  });
});
