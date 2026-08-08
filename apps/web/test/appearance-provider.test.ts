import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { parseNajmDesignConfig } from "najm-kit";
import { readFileSync } from "node:fs";

import { appearanceKeys } from "../src/hooks/appearanceKeys";
import {
  getAppearance,
  resetAppearance,
  updateAppearance,
} from "../src/services/appearanceApi";
import {
  DEFAULT_APPEARANCE_REVISION,
  getFactoryDesignConfig,
  loadAppearanceWith,
} from "../src/lib/appearanceLoader";
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
    const loader = readSource("../src/lib/appearanceLoader.ts");

    expect(layout).toContain("loadServerAppearance");
    expect(layout).toContain("initialDesign={appearance.designConfig}");
    expect(loader).toContain("server.fetch");
    expect(loader).toContain("loadAppearanceWith");
    expect(loader).toContain("/api/appearance");
    expect(loader).toContain("getFactoryDesignConfig");
    expect(loader).toContain("factory theme");
  });
});

describe("server appearance loader", () => {
  let warning: ReturnType<typeof spyOn<typeof console, "warn">>;

  beforeEach(() => {
    warning = spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    warning.mockRestore();
  });

  test("returns the parsed payload from a successful public GET", async () => {
    const factory = getFactoryDesignConfig();
    const appearance: PublicAppearance = { designConfig: factory, revision: 5 };
    const fetcher = async () =>
      new Response(JSON.stringify({ data: appearance }), { status: 200 });

    await expect(loadAppearanceWith(fetcher)).resolves.toEqual(appearance);
    expect(warning).not.toHaveBeenCalled();
  });

  test("falls back to the factory design for a non-ok response", async () => {
    const fetcher = async () =>
      new Response(JSON.stringify({ message: "boom" }), { status: 503 });

    await expect(loadAppearanceWith(fetcher)).resolves.toEqual({
      designConfig: getFactoryDesignConfig(),
      revision: DEFAULT_APPEARANCE_REVISION,
    });
    expect(warning).toHaveBeenCalled();
  });

  test("falls back to the factory design for a malformed payload", async () => {
    const fetcher = async () =>
      new Response(JSON.stringify({ data: { designConfig: null } }), {
        status: 200,
      });

    await expect(loadAppearanceWith(fetcher)).resolves.toEqual({
      designConfig: getFactoryDesignConfig(),
      revision: DEFAULT_APPEARANCE_REVISION,
    });
  });

  test("falls back to the factory design when the fetcher throws", async () => {
    const fetcher = async () => {
      throw new Error("database unavailable");
    };

    await expect(loadAppearanceWith(fetcher)).resolves.toEqual({
      designConfig: getFactoryDesignConfig(),
      revision: DEFAULT_APPEARANCE_REVISION,
    });
  });
});
