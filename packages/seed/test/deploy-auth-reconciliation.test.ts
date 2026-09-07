import { readFileSync } from "node:fs";

import { describe, expect, it } from "bun:test";

const deploySource = readFileSync(
  new URL("../../../scripts/deployVps.sh", import.meta.url),
  "utf8",
);
const composeSource = readFileSync(
  new URL("../../../compose.production.yml", import.meta.url),
  "utf8",
);
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

    expect(deploySource).toContain("pull app migrate auth-reconcile notifications-worker");
    expect(deploySource).toContain(
      '"${compose[@]}" --profile tools run --rm auth-reconcile',
    );
    expect(seedAuthSource).toContain("reconcileAuthorizationSeed");
    expect(seedAuthSource).toContain("pg_advisory_xact_lock");
    expect(seedAuthSource).toContain("verifyAuthorizationSeed");
    const authorizationStart = seedAuthSource.indexOf(
      "export async function reconcileAuthorizationSeed",
    );
    const authorizationEnd = seedAuthSource.indexOf(
      "\nasync function reconcileBootstrapAdminEmail",
      authorizationStart,
    );
    const authorizationReconciliation = seedAuthSource.slice(
      authorizationStart,
      authorizationEnd,
    );
    expect(authorizationStart).toBeGreaterThanOrEqual(0);
    expect(authorizationEnd).toBeGreaterThan(authorizationStart);
    expect(authorizationReconciliation).toContain("AUTH_ROLES");
    expect(authorizationReconciliation).toContain("AUTH_PERMISSIONS");
    expect(authorizationReconciliation).toContain("AUTH_ROLE_PERMISSIONS");
    expect(authorizationReconciliation).not.toContain("usersTable");
    expect(authorizationReconciliation).not.toContain("tokensTable");
    expect(authorizationReconciliation).not.toContain("adminEmail");
    expect(authorizationReconciliation).not.toContain("adminPassword");
    expect(reconciliationSource).toContain("reconcileAuthorizationSeed");
    expect(reconciliationSource).not.toContain("readSeedConfig");
    expect(reconciliationSource).not.toContain("adminEmail");
    expect(reconciliationSource).not.toContain("adminPassword");
    expect(reconciliationSource).toContain(
      'console.log("Auth seed reconciliation passed.")',
    );
    expect(reconciliationSource).toContain(
      'console.error("Auth seed reconciliation failed.")',
    );
    expect(reconciliationSource).not.toContain("printVerification");
    expect(reconciliationSource).not.toContain("error instanceof Error");
  });
});
