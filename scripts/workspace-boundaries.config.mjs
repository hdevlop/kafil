// Kafil's workspace dependency policy, enforced by
// scripts/check-workspace-boundaries.mjs. See docs/architecture/workspace.md.

/** Packages whose runtime is server-only, whatever file imports them. */
const SERVER_ONLY_PACKAGES = [
  "server-only",
  "postgres",
  "pg",
  "ioredis",
  "redis",
  "drizzle-orm",
  "drizzle-kit",
  "nodemailer",
  "web-push",
  "sharp",
  "reflect-metadata",
  "diject",
  "hono",
  "najm-cache",
  "najm-core",
  "najm-database",
  "najm-email",
  "najm-guard",
  "najm-mcp",
  "najm-rate",
  "najm-storage",
  "najm-validation",
];

const policy = {
  packages: {
    "@kafil/web": { dir: "apps/web", role: "app", sources: ["src", "test"] },
    "@kafil/contracts": { dir: "packages/contracts", role: "contracts", sources: ["src", "test"] },
    "@kafil/server": { dir: "packages/server", role: "server", sources: ["src", "test", "theme"] },
    "@kafil/seed": { dir: "packages/seed", role: "seed", sources: ["src", "test"] },
  },

  // Which workspace roles each role may import, at runtime or as types.
  allowedDependencies: {
    app: ["contracts", "server"],
    server: ["contracts"],
    seed: ["server", "contracts"],
    contracts: [],
  },

  contracts: {
    // Audited portable dependencies: the i18n definition helper only, never
    // the server plugin.
    allowedExternal: ["najm-i18n/define"],
    // Contract tests run under Bun; the runner is not a package dependency.
    allowedInTests: ["bun:test"],
  },

  browser: {
    entryRoles: ["app"],
    forbiddenRoles: ["server", "seed"],
    forbiddenExternal: [
      ...SERVER_ONLY_PACKAGES,
      "najm-auth/server",
      "najm-i18n/server",
      "najm-next/app/next",
      "najm-next/app/server",
      "najm-next/config",
      "najm-next/location/server",
      "najm-theme/server",
      "najm-theme/pg",
    ],
    // Audited client entries of packages whose root is server-only. Read the
    // published entry's imports before adding one; never add a root package.
    allowedExternal: [],
    forbiddenSpecifiers: [],
  },
};

export default policy;
