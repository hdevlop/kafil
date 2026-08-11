import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const sourceRoot = join(import.meta.dir, "..", "src");

function source(relativePath: string) {
  return readFileSync(join(sourceRoot, relativePath), "utf8");
}

describe("published media contract integration", () => {
  test("removes the three local media and status wrappers", () => {
    const retiredNames = [
      ["Managed", "Avatar.tsx"],
      ["Protected", "Image.tsx"],
      ["Status", "Badge.tsx"],
    ].map((parts) => parts.join(""));

    for (const name of retiredNames) {
      const wrapper = join("shared", name);
      expect(existsSync(join(sourceRoot, wrapper))).toBe(false);
    }

    const files = [...new Bun.Glob("**/*.{ts,tsx}").scanSync({ cwd: sourceRoot })];
    for (const file of files) {
      const content = source(file);
      for (const name of retiredNames) {
        expect(content).not.toContain(`@/shared/${name.replace(".tsx", "")}`);
      }
    }
  });

  test("uses the Next-only adapter with explicit direct delivery", () => {
    const files = [...new Bun.Glob("**/*.tsx").scanSync({ cwd: sourceRoot })];
    const consumers = files.filter((file) => source(file).includes("<NNextImage"));

    expect(consumers.length).toBeGreaterThan(0);
    for (const consumer of consumers) {
      const content = source(consumer);
      expect(content).toContain('from "najm-kit/next"');
      expect(content).toContain("<NNextImage unoptimized");
      expect(content).not.toContain('from "next/image"');
    }
  });

  test("wires representative avatars directly to the package contract", () => {
    const contribution = source(
      "features/Contributions/components/ContributionDetails.tsx",
    );
    const familyDashboard = source(
      "features/Dashboard/FamilyDashboard/components/FamilyDashboardPage.tsx",
    );

    expect(contribution).toContain("<NAvatar");
    expect(contribution).toContain("fallbackSrc={getPersonImage");
    expect(familyDashboard).toContain("<NAvatar");
    expect(familyDashboard).toContain("fallbackSrc={getPersonImage");
  });

  test("delegates branding delivery to najm-theme", () => {
    // Kafil no longer owns a branding image component. `NThemeImage` renders
    // the slot, and the factory bytes are served by the definition under a
    // content-hashed, immutable name — which is a better cache story than the
    // Next optimizer gave the old public file, and one this app cannot get
    // wrong by forgetting a prop.
    for (const path of ["app/(auth)/layout.tsx", "app/(first-login)/layout.tsx"]) {
      const layout = source(path);
      expect(layout).toContain("<NThemeImage");
      expect(layout).not.toContain("unoptimized");
    }
  });

  test("uses the authoritative normalized path returned by every upload", () => {
    // Branding is absent: `najm-theme` owns its upload client, and its own
    // tests pin that the committed file name comes from the server.
    for (const service of [
      "services/categoryApi.ts",
      "services/childApi.ts",
      "services/familyApi.ts",
      "services/productApi.ts",
      "services/sponsorApi.ts",
      "services/staffApi.ts",
    ]) {
      const content = source(service);
      expect(content).toContain("api.upload<");
      expect(content).not.toContain("return `/api${");
      expect(content).toContain("return uploaded.path");
    }
  });
});
