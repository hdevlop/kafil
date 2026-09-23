import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const appRoot = resolve(import.meta.dir, "..");
const repoRoot = resolve(appRoot, "..", "..");
const fixtureRoot = mkdtempSync(resolve(tmpdir(), "kafil-env-contract-"));
const sentinelName = "KAFIL_WORKSPACE_ENV_SENTINEL";

afterAll(() => rmSync(fixtureRoot, { force: true, recursive: true }));

function probe(envFile: string | undefined, inherited?: string) {
  const env = { ...process.env };
  if (inherited === undefined) delete env[sentinelName];
  else env[sentinelName] = inherited;
  const result = Bun.spawnSync({
    cmd: [
      process.execPath,
      ...(envFile ? [`--env-file=${envFile}`] : []),
      "-e",
      `process.stdout.write(process.env.${sentinelName} ?? "missing");`,
    ],
    cwd: appRoot,
    env,
    stderr: "pipe",
    stdout: "pipe",
  });
  expect(result.exitCode, result.stderr.toString()).toBe(0);
  return result.stdout.toString();
}

describe("workspace environment contract", () => {
  test("the explicit app-local loader works and inherited values win", () => {
    const envFile = resolve(fixtureRoot, ".env.local");
    writeFileSync(envFile, `${sentinelName}=from-file\n`);
    expect(probe(envFile)).toBe("from-file");
    expect(probe(envFile, "from-process")).toBe("from-process");
  });

  test("injected-only mode works without a local file", () => {
    const emptyFixture = resolve(fixtureRoot, "injected-only");
    mkdirSync(emptyFixture);
    expect(probe(undefined, "injected-only")).toBe("injected-only");
  });

  test("all operational loaders target the app-local file", () => {
    const rootPackage = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    const seedPackage = JSON.parse(readFileSync(resolve(repoRoot, "packages/seed/package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    const operational = Object.entries(rootPackage.scripts).filter(([name]) =>
      /^(db:|seed(?::|$)|setup$|notifications:|contributions:|images:|theme:|test:db$)/u.test(name),
    );

    expect(operational.length).toBeGreaterThan(0);
    for (const [name, command] of operational) {
      expect(command, name).toContain("apps/web/.env.local");
      expect(command, name).not.toMatch(/(?:^|[/=])\.env(?:\s|$)/u);
    }
    expect(seedPackage.scripts["test:db"]).toContain("../../apps/web/.env.local");
    expect(readFileSync(resolve(repoRoot, "packages/seed/bunfig.toml"), "utf8")).toContain(
      'env = "../../apps/web/.env.local"',
    );
  });
});
