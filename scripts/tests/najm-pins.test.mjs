import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * One version of each Najm package. The root `overrides` decide what is
 * installed, so each Najm package (and diject, which reaches Kafil through
 * Najm) is pinned there to an exact version, and every workspace that declares
 * one declares that same version. A workspace pin that drifts from its
 * override changes nothing at install time, and nothing else notices it.
 */

const root = fileURLToPath(new URL("../../", import.meta.url));
const read = (path) => JSON.parse(readFileSync(join(root, path), "utf8"));
const manifest = read("package.json");
const isNajm = (name) => name === "diject" || name.startsWith("najm-");
const overrides = Object.fromEntries(
  Object.entries(manifest.overrides ?? {}).filter(([name]) => isNajm(name)),
);

function workspaceManifests() {
  return manifest.workspaces.flatMap((pattern) => {
    if (!pattern.endsWith("/*")) throw new Error(`Unsupported workspace pattern: ${pattern}`);
    const parent = pattern.slice(0, -2);
    return readdirSync(join(root, parent), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && existsSync(join(root, parent, entry.name, "package.json")))
      .map((entry) => `${parent}/${entry.name}/package.json`);
  });
}

function declarations() {
  return ["package.json", ...workspaceManifests()].flatMap((path) => {
    const workspace = read(path);
    return ["dependencies", "devDependencies", "peerDependencies"].flatMap((section) =>
      Object.entries(workspace[section] ?? {})
        .filter(([name]) => isNajm(name))
        .map(([name, version]) => ({ path, section, name, version })),
    );
  });
}

describe("Najm pins", () => {
  it("are exact versions in the root overrides", () => {
    expect(Object.keys(overrides).length).toBeGreaterThan(1);
    for (const [name, version] of Object.entries(overrides)) {
      expect(version, name).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  it("cover every Najm package a workspace declares", () => {
    const missing = [...new Set(declarations().map(({ name }) => name))].filter((name) => !(name in overrides));
    expect(missing).toEqual([]);
  });

  it("are the same in every workspace", () => {
    const stale = declarations()
      .filter(({ name, version }) => version !== overrides[name])
      .map(({ path, section, name, version }) => `${path} ${section} ${name} ${version}`);
    expect(stale).toEqual([]);
  });
});
