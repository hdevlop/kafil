import { readFileSync } from "node:fs";

import { describe, expect, it } from "bun:test";

const deploySource = readFileSync(
  new URL("../../../scripts/deployVps.sh", import.meta.url),
  "utf8",
);

describe("VPS auth grant reconciliation", () => {
  it("reconciles and verifies code-managed permissions before replacing the app", () => {
    const migration = deploySource.indexOf(
      '"${compose[@]}" --profile tools run --rm migrate',
    );
    const authSeed = deploySource.indexOf(
      '"${compose[@]}" --profile tools run --rm --no-deps app',
    );
    const appReplacement = deploySource.indexOf(
      '"${compose[@]}" up -d --no-deps app',
    );

    expect(migration).toBeGreaterThan(-1);
    expect(authSeed).toBeGreaterThan(migration);
    expect(appReplacement).toBeGreaterThan(authSeed);
    expect(deploySource).toContain("bun run seed:admin");
    expect(deploySource).toContain('>"${auth_seed_log}" 2>&1');
    expect(deploySource).toContain("Auth seed reconciliation failed");
    expect(deploySource).toContain("auth_seed_log_sha256");
  });

  it("protects deployment logs from other local users", () => {
    expect(deploySource).toContain("umask 077");
  });
});
