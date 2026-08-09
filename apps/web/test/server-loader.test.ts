import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const serverLoader = readSource("../src/lib/serverLoader.ts");

describe("the server UI bootstrap boundary", () => {
  test("is one module-scoped adapter instance with a server-only guard", () => {
    expect(serverLoader).toStartWith('import "server-only";');
    expect(serverLoader).toContain(
      'import { createReactServerUiBootstrap } from "najm-kit/server/react"',
    );

    // The adapter memoizes one bootstrap per request, and only callers that
    // reach the same instance share it. A second call anywhere — including
    // inside a layout — would hand some surface its own resolution.
    const instances = serverLoader
      .split("\n")
      .filter((line) => line.includes("createReactServerUiBootstrap("));
    expect(instances).toEqual([
      "const serverUi = createReactServerUiBootstrap({",
    ]);
  });

  test("all server-rendered branding consumers use the shared boundary", () => {
    const consumers = [
      "../src/app/layout.tsx",
      "../src/app/(auth)/layout.tsx",
      "../src/app/(first-login)/layout.tsx",
    ];

    const offenders = consumers.filter(
      (path) => !readSource(path).includes('from "@/lib/serverLoader"'),
    );
    expect(offenders).toEqual([]);
  });

  test("the resources module does not boot the complete application server", () => {
    const resources = readSource("../src/lib/uiResources.ts");

    expect(resources).not.toContain('import "server-only"');
    expect(resources).not.toContain('import("@kafil/server")');
    expect(resources).toContain("parseAppearanceDesignConfig");
    expect(resources).toContain("getServerFactoryDesignConfig");
  });
});
