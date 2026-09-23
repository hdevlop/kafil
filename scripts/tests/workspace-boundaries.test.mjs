import { afterAll, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, posix } from "node:path";

import { checkWorkspace } from "../check-workspace-boundaries.mjs";
import policy from "../workspace-boundaries.config.mjs";

/**
 * Each case writes a small workspace shaped like this repository — the same
 * package names, directories and roles, read from the real policy file — and
 * runs the real checker with that policy. A case proves a rule by the
 * violation, and the import chain, that the checker reports for it.
 *
 * This file is shared unchanged by School and Kafil.
 */

const json = (value) => JSON.stringify(value, null, 2);

function byRole(role) {
  const entry = Object.entries(policy.packages).find(([, pkg]) => pkg.role === role);
  if (!entry) throw new Error(`The policy declares no ${role} package`);
  return { name: entry[0], dir: entry[1].dir };
}

const APP = byRole("app");
const CONTRACTS = byRole("contracts");
const SERVER = byRole("server");
const SEED = byRole("seed");
const LOOKUP = policy.browser?.forbiddenSpecifiers?.[0];

const app = (path) => `${APP.dir}/${path}`;
const contracts = (path) => `${CONTRACTS.dir}/${path}`;
const server = (path) => `${SERVER.dir}/${path}`;
const seed = (path) => `${SEED.dir}/${path}`;
const relativeImport = (fromFile, toFile) => {
  const path = posix.relative(posix.dirname(fromFile), toFile);
  return path.startsWith(".") ? path : `./${path}`;
};
const dependencies = (...names) => Object.fromEntries(names.map((name) => [name, "workspace:*"]));

const CONTRACTS_MANIFEST = {
  name: CONTRACTS.name,
  exports: {
    ".": "./src/index.ts",
    "./locales": "./src/locales/index.ts",
    "./lookup": "./src/lookup.ts",
  },
  dependencies: { "najm-i18n": "2.1.2" },
};

const BASE = {
  "package.json": json({ name: "fixture", private: true, workspaces: ["apps/*", "packages/*"] }),

  [app("package.json")]: json({ name: APP.name, dependencies: dependencies(CONTRACTS.name, SERVER.name) }),
  [app("tsconfig.json")]: json({
    compilerOptions: {
      module: "esnext",
      moduleResolution: "bundler",
      jsx: "preserve",
      allowJs: true,
      resolveJsonModule: true,
      paths: { "@/*": ["./src/*"] },
    },
  }),
  [app("src/app/api/route.ts")]: `import { server } from '${SERVER.name}';\nexport const GET = () => server;\n`,
  [app("src/app/page.tsx")]: `import { Widget } from '@/components/Widget';\nexport default function Page() { return <Widget />; }\n`,
  [app("src/components/Widget.tsx")]: [
    `'use client';`,
    `import { labels } from '${CONTRACTS.name}/locales';`,
    `import { VALUES } from '${CONTRACTS.name}';`,
    `import { format } from '@/lib/format';`,
    `export function Widget() { return <p>{format(labels.hello, VALUES)}</p>; }`,
    ``,
  ].join("\n"),
  [app("src/lib/format.ts")]: "export const format = (text: string, values: readonly string[]) => `${text} ${values.join(',')}`;\n",

  [contracts("package.json")]: json(CONTRACTS_MANIFEST),
  [contracts("src/index.ts")]: `export const VALUES = ['a', 'b'] as const;\n`,
  [contracts("src/lookup.ts")]: `import { VALUES } from './index';\nexport const lookup = { VALUES };\n`,
  [contracts("src/locales/index.ts")]: `import { defineI18n } from 'najm-i18n/define';\nimport en from './en.json';\nexport const labels = en;\nexport const i18n = defineI18n;\n`,
  [contracts("src/locales/en.json")]: json({ hello: "Hello" }),
  [contracts("tests/values.test.ts")]: `import { expect, it } from 'bun:test';\nimport { VALUES } from '../src';\nit('has values', () => expect(VALUES.length).toBe(2));\n`,

  [server("package.json")]: json({
    name: SERVER.name,
    exports: { ".": "./src/index.ts", "./theme": "./src/theme.ts" },
    dependencies: dependencies(CONTRACTS.name),
  }),
  [server("src/index.ts")]: `import postgres from 'postgres';\nimport { VALUES } from '${CONTRACTS.name}';\nexport type ServerRow = { id: string };\nexport const server = { postgres, VALUES };\n`,
  [server("src/theme.ts")]: `export const theme = {};\n`,
  [server("src/internal.ts")]: `export const internal = 1;\n`,

  [seed("package.json")]: json({ name: SEED.name, dependencies: dependencies(CONTRACTS.name, SERVER.name) }),
  [seed("src/run.ts")]: `import { server } from '${SERVER.name}';\nimport { VALUES } from '${CONTRACTS.name}';\nexport default [server, VALUES];\n`,
};

const roots = [];
afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

function check(changes = {}) {
  const root = mkdtempSync(join(tmpdir(), "workspace-boundaries-"));
  roots.push(root);
  for (const [path, content] of Object.entries({ ...BASE, ...changes })) {
    if (content === null) continue;
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  return checkWorkspace({ root, policy });
}

const clientFile = (...lines) => ["'use client';", ...lines, ""].join("\n");

function expectViolation(result, rule, ...fragments) {
  const match = result.violations.find((violation) => {
    const text = [violation.message, violation.file, ...(violation.chain ?? [])].join("\n");
    return violation.rule === rule && fragments.every((fragment) => text.includes(fragment));
  });
  if (!match) {
    throw new Error(`Expected a ${rule} violation mentioning ${fragments.join(", ")}; got:\n${JSON.stringify(result.violations, null, 2)}`);
  }
  return match;
}

describe("allowed graphs", () => {
  it("passes contracts locales and values in client code, server exports in server entrypoints", () => {
    const result = check();
    expect(result.violations).toEqual([]);
    expect(result.stats.clientEntries).toBe(1);
  });

  it("reports a type-only client import from the server separately instead of failing", () => {
    const result = check({
      [app("src/components/Rows.tsx")]: clientFile(
        `import type { ServerRow } from '${SERVER.name}';`,
        `export const Rows = (rows: ServerRow[]) => rows.length;`,
      ),
    });
    expect(result.violations).toEqual([]);
    expect(result.typeCoupling).toEqual([
      expect.objectContaining({ file: `${app("src/components/Rows.tsx")}:2`, specifier: SERVER.name }),
    ]);
  });

  it("does not treat a server component importing the server as a browser graph", () => {
    const result = check({
      [app("src/app/page.tsx")]: `import { server } from '${SERVER.name}';\nexport default function Page() { return String(server); }\n`,
    });
    expect(result.violations).toEqual([]);
  });
});

describe("browser graphs", () => {
  it("rejects a direct client import of the server package", () => {
    const result = check({
      [app("src/components/Direct.tsx")]: clientFile(`import { server } from '${SERVER.name}';`, `export const x = server;`),
    });
    expectViolation(result, "browser", `server package ${SERVER.name}`, `${app("src/components/Direct.tsx")}:2 -> ${SERVER.name}`);
  });

  it("follows shared helpers transitively and reports the whole chain", () => {
    const result = check({
      [app("src/lib/format.ts")]: `import { server } from '${SERVER.name}';\nexport const format = () => String(server);\n`,
    });
    const violation = expectViolation(result, "browser", `server package ${SERVER.name}`);
    expect(violation.chain).toEqual([
      `${app("src/components/Widget.tsx")}:4 -> @/lib/format`,
      `${app("src/lib/format.ts")}:1 -> ${SERVER.name}`,
    ]);
  });

  it("checks client route files under app/", () => {
    const result = check({
      [app("src/app/settings/page.tsx")]: clientFile(`import { theme } from '${SERVER.name}/theme';`, `export default () => theme;`),
    });
    expectViolation(result, "browser", `${app("src/app/settings/page.tsx")}:2 -> ${SERVER.name}/theme`);
  });

  it("rejects side-effect imports that reach Node built-ins", () => {
    const result = check({
      [app("src/lib/boot.ts")]: `import 'node:fs';\n`,
      [app("src/components/Boot.tsx")]: clientFile(`import '@/lib/boot';`, `export const x = 1;`),
    });
    expectViolation(result, "browser", "Node built-in node:fs", `${app("src/lib/boot.ts")}:1 -> node:fs`);
  });

  it("rejects literal dynamic imports", () => {
    const result = check({
      [app("src/components/Lazy.tsx")]: clientFile(`export const load = () => import('${SERVER.name}');`),
    });
    expectViolation(result, "browser", `Lazy.tsx:2 -> ${SERVER.name}`);
  });

  it("rejects CommonJS requires of server-only packages", () => {
    const result = check({
      [app("src/components/Legacy.tsx")]: clientFile(`const postgres = require('postgres');`, `export const x = postgres;`),
    });
    expectViolation(result, "browser", "server-only package postgres");
  });

  it("treats a package installed inside a workspace's own node_modules as external", () => {
    const result = check({
      [app("node_modules/postgres/package.json")]: json({ name: "postgres", main: "index.js" }),
      [app("node_modules/postgres/index.js")]: `module.exports = {};\n`,
      [app("src/components/Nested.tsx")]: clientFile(`import postgres from 'postgres';`, `export const x = postgres;`),
    });
    expectViolation(result, "browser", "server-only package postgres", `${app("src/components/Nested.tsx")}:2 -> postgres`);
  });

  it("rejects computed module loading it cannot verify", () => {
    const result = check({
      [app("src/components/Computed.tsx")]: clientFile(`export const load = (name: string) => import(name);`),
    });
    expectViolation(result, "browser", "computed dynamic import");
  });

  it("rejects a server package hidden behind an app re-export barrel", () => {
    const result = check({
      [app("src/lib/index.ts")]: `export { server } from '${SERVER.name}';\n`,
      [app("src/components/Barrel.tsx")]: clientFile(`import { server } from '@/lib';`, `export const x = server;`),
    });
    const violation = expectViolation(result, "browser", `server package ${SERVER.name}`);
    expect(violation.chain.at(-1)).toBe(`${app("src/lib/index.ts")}:1 -> ${SERVER.name}`);
  });

  it("rejects a module marked server-only", () => {
    const result = check({
      [app("src/lib/secret.ts")]: `import 'server-only';\nexport const secret = 1;\n`,
      [app("src/components/Secret.tsx")]: clientFile(`import { secret } from '@/lib/secret';`, `export const x = secret;`),
    });
    expectViolation(result, "browser", "server-only");
  });

  it.skipIf(!LOOKUP)("rejects a specifier the policy marks server-only", () => {
    const result = check({
      [app("src/components/Lookup.tsx")]: clientFile(`import { lookup } from '${LOOKUP}';`, `export const x = lookup;`),
    });
    expectViolation(result, "browser", `${LOOKUP}, which is server-only by policy`);
  });
});

describe("package direction and exports", () => {
  it("rejects a relative escape into another package", () => {
    const from = app("src/app/api/escape.ts");
    const result = check({
      [from]: `import { internal } from '${relativeImport(from, server("src/internal"))}';\nexport default internal;\n`,
    });
    expectViolation(result, "exports", `reaches into ${SERVER.name} without its package exports`, `${from}:1`);
  });

  it("rejects a tsconfig alias that bypasses package exports", () => {
    const result = check({
      [app("tsconfig.json")]: json({
        compilerOptions: {
          module: "esnext",
          moduleResolution: "bundler",
          jsx: "preserve",
          paths: { "@/*": ["./src/*"], "@server/*": [`${relativeImport(app("tsconfig.json"), server("src"))}/*`] },
        },
      }),
      [app("src/app/api/alias.ts")]: `import { internal } from '@server/internal';\nexport default internal;\n`,
    });
    expectViolation(result, "exports", `"@server/internal" reaches into ${SERVER.name}`);
  });

  it("rejects a subpath the package does not export", () => {
    const result = check({
      [app("src/app/api/deep.ts")]: `import { internal } from '${SERVER.name}/src/internal';\nexport default internal;\n`,
    });
    expectViolation(result, "exports", `is not an export of ${SERVER.name}`);
  });

  it("rejects an import of a workspace package the importer does not declare", () => {
    const result = check({
      [seed("package.json")]: json({ name: SEED.name, dependencies: dependencies(SERVER.name) }),
    });
    expectViolation(result, "exports", `${SEED.name} imports ${CONTRACTS.name} without declaring it`);
  });

  it("rejects app -> seed", () => {
    const result = check({
      [app("package.json")]: json({ name: APP.name, dependencies: dependencies(CONTRACTS.name, SERVER.name, SEED.name) }),
      [seed("package.json")]: json({
        name: SEED.name,
        exports: { ".": "./src/run.ts" },
        dependencies: dependencies(CONTRACTS.name, SERVER.name),
      }),
      [app("src/app/api/seed.ts")]: `import run from '${SEED.name}';\nexport default run;\n`,
    });
    expectViolation(result, "direction", `app package ${APP.name} must not depend on seed package ${SEED.name}`);
  });

  it("rejects server -> app and server -> seed", () => {
    const from = server("src/reverse.ts");
    const result = check({
      [from]: [
        `import page from '${relativeImport(from, app("src/app/page"))}';`,
        `import run from '${relativeImport(from, seed("src/run"))}';`,
        `export default [page, run];`,
        ``,
      ].join("\n"),
    });
    expectViolation(result, "direction", `server package ${SERVER.name} must not depend on app package ${APP.name}`);
    expectViolation(result, "direction", `server package ${SERVER.name} must not depend on seed package ${SEED.name}`);
  });
});

describe("contracts portability", () => {
  it("rejects contracts -> server", () => {
    const result = check({
      [contracts("src/index.ts")]: `import { server } from '${SERVER.name}';\nexport const VALUES = ['a', 'b'] as const;\nexport const leak = server;\n`,
    });
    expectViolation(result, "direction", `contracts package ${CONTRACTS.name} must not depend on server package ${SERVER.name}`);
  });

  it("rejects Node built-ins and unaudited dependencies in contracts source", () => {
    const result = check({
      [contracts("src/io.ts")]: `import { readFileSync } from 'node:fs';\nimport { z } from 'zod';\nexport const read = () => [readFileSync, z];\n`,
    });
    expectViolation(result, "contracts", "Node built-in node:fs");
    expectViolation(result, "contracts", `found "zod"`);
  });

  it("rejects an unaudited dependency declared in the contracts manifest", () => {
    const result = check({
      [contracts("package.json")]: json({
        ...CONTRACTS_MANIFEST,
        dependencies: { ...CONTRACTS_MANIFEST.dependencies, "drizzle-orm": "0.45.2" },
      }),
    });
    expectViolation(result, "contracts", "declares dependency drizzle-orm");
  });

  it("allows the test runner in contract tests only", () => {
    expect(check().violations).toEqual([]);
    const result = check({ [contracts("src/runner.ts")]: `import { it } from 'bun:test';\nexport const run = it;\n` });
    expectViolation(result, "contracts", "Node built-in bun:test");
  });
});
