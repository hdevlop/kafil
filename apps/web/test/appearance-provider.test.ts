import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { parseNajmDesignConfig } from "najm-kit";
import { readFileSync } from "node:fs";

import { appearanceKeys } from "../src/hooks/appearanceKeys";
import {
  getAppearance,
  resetAppearance,
  updateAppearance,
} from "../src/services/appearanceApi";
import { createUiBootstrapLoader } from "najm-kit/server";
import {
  DEFAULT_APPEARANCE_REVISION,
  appearanceResource,
  getFactoryDesignConfig,
  reportUiBootstrapDiagnostic,
  uiResources,
} from "../src/lib/uiResources";
import { getFactoryBranding } from "@kafil/server/branding";
import type { PublicAppearance } from "../src/types/appearance";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("appearance factory", () => {
  test("parses the version-controlled theme.json and matches the installed Najm Kit contract", () => {
    const factory = getFactoryDesignConfig();
    const validated = parseNajmDesignConfig(factory);

    expect(validated.version).toBe(1);
    expect(validated.theme.mode).toBe("light");
    expect(validated.theme.accent).toBe("emerald");
    expect(validated.typography?.fontSans).toContain("var(--font-cairo)");
    expect(DEFAULT_APPEARANCE_REVISION).toBe(1);
  });

  test("returns independent clones across calls", () => {
    const first = getFactoryDesignConfig();
    const second = getFactoryDesignConfig();
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    first.theme.tokens = { ...first.theme.tokens, primary: "#000000" };
    expect(second.theme.tokens?.primary).not.toBe("#000000");
  });
});

describe("appearance query keys", () => {
  test("exposes a stable singleton key and a shared namespace", () => {
    expect(appearanceKeys.current).toEqual(["appearance", "detail", "current"]);
    expect(appearanceKeys.all).toEqual(["appearance"]);
  });
});

describe("appearance api surface", () => {
  test("calls the public GET, admin PUT, and admin POST endpoints", () => {
    expect(getAppearance.length).toBe(0);
    expect(updateAppearance.length).toBe(1);
    expect(resetAppearance.length).toBe(1);
  });
});

describe("appearance provider wiring", () => {
  /**
   * The draft/commit state machine this file used to cover now lives in
   * `najm-kit` (`NajmDesignEditorProvider`, covered by its own
   * `design-editor.test.tsx`). Nothing about it was Kafil-specific: an app with
   * a theme editor was forced to own the draft only because `design` was a
   * prop. What is left to assert here is the seam — that Kafil seeds the kit
   * and does not grow the layer back.
   */
  test("AppProviders seeds the kit and holds no UI state of its own", () => {
    const appProviders = readSource("../src/providers/AppProviders.tsx");

    expect(appProviders).toContain("NajmAppProvider");
    expect(appProviders).toContain("initialDesign={initialDesign}");
    expect(appProviders).toContain("initialTimeZone={initialTimeZone}");
    // The kit validates the zone itself now. Kafil's allowlist normalizer was
    // guarding a value already normalized server-side in `layout.tsx` and only
    // ever set from a picker built off that same list.
    expect(appProviders).not.toContain("normalizeTimeZone");
    // Seeds, not state. A reducer or a draft here means the collapse came undone.
    expect(appProviders).not.toContain("useReducer");
    expect(appProviders).not.toContain("useState");
    expect(appProviders).not.toContain("Draft");
    expect(appProviders).not.toContain("KafilUIProvider");
    expect(appProviders).not.toContain("createContext");
  });

  test("the theme editor drives the kit's draft and owns only the revision", () => {
    const hook = readSource("../src/features/Settings/hooks/useAppearanceEditor.ts");

    expect(hook).toContain("useNajmDesignEditor");
    expect(hook).toContain("useAppearanceCommands");
    expect(hook).toContain("expectedRevision");
    expect(hook).toContain("setCommitted");
    // The draft belongs to the kit now — a local copy here would be a second
    // source of truth for the live preview.
    expect(hook).not.toContain("useReducer");
    expect(hook).not.toContain("beginDraft");
  });

  test("root layout loads the appearance server-side with a factory fallback", () => {
    const layout = readSource("../src/app/layout.tsx");
    const resources = readSource("../src/lib/uiResources.ts");
    const serverLoader = readSource("../src/lib/serverLoader.ts");

    expect(layout).toContain("loadServerAppearance");
    expect(layout).toContain("initialDesign={appearance.designConfig}");
    expect(layout).toContain('from "@/lib/serverLoader"');
    expect(serverLoader).toContain("server.fetch");
    expect(resources).toContain("/api/appearance");
    expect(resources).toContain("getFactoryDesignConfig");
    expect(resources).toContain("factory theme");
  });
});

describe("appearance resource", () => {
  let warning: ReturnType<typeof spyOn<typeof console, "warn">>;

  beforeEach(() => {
    warning = spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    warning.mockRestore();
  });

  test("is served from the public appearance endpoint", () => {
    expect(appearanceResource.path).toBe("/api/appearance");
  });

  test("falls back to the version-controlled theme at the default revision", () => {
    expect(appearanceResource.fallback()).toEqual({
      designConfig: getFactoryDesignConfig(),
      revision: DEFAULT_APPEARANCE_REVISION,
    });
  });

  test("accepts a persisted appearance", () => {
    const appearance: PublicAppearance = {
      designConfig: getFactoryDesignConfig(),
      revision: 5,
    };

    expect(appearanceResource.parse(appearance)).toEqual(appearance);
  });

  test("rejects a payload without a positive revision", () => {
    const designConfig = getFactoryDesignConfig();

    expect(appearanceResource.parse({ designConfig })).toBeUndefined();
    expect(appearanceResource.parse({ designConfig, revision: 0 })).toBeUndefined();
    expect(appearanceResource.parse({ designConfig, revision: 1.5 })).toBeUndefined();
  });

  test("rejects an invalid design behind a positive revision", () => {
    // Kafil's validator is stricter than the kit's general design parser, and
    // it throws rather than returning undefined. The loader treats both the
    // same way, so a persisted row that no longer parses still renders.
    expect(() => appearanceResource.parse({ designConfig: null, revision: 4 })).toThrow();
  });

  test("reports a fallback without leaking the response", () => {
    reportUiBootstrapDiagnostic({
      resource: "appearance",
      reason: "response-not-ok",
      path: "/api/appearance",
      status: 503,
    });

    expect(warning).toHaveBeenCalled();
    const [message] = warning.mock.calls[0]!;
    expect(message).toContain("appearance");
    expect(message).toContain("503");
    expect(message).toContain("factory theme");
  });
});

describe("public UI bootstrap", () => {
  test("loads appearance and branding through one shared fetch boundary", async () => {
    const requested: string[] = [];
    const appearance: PublicAppearance = {
      designConfig: getFactoryDesignConfig(),
      revision: 3,
    };
    const branding = { ...getFactoryBranding(), revision: 6 };

    const result = await createUiBootstrapLoader({
      fetcher: async (path) => {
        requested.push(path);
        const data = path === "/api/appearance" ? appearance : branding;
        return new Response(JSON.stringify({ data }), { status: 200 });
      },
      resources: uiResources,
    }).load();

    expect(new Set(requested)).toEqual(
      new Set(["/api/appearance", "/api/branding"]),
    );
    expect(result).toEqual({ appearance, branding });
  });
});
