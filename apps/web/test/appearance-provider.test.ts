import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { parseNajmDesignConfig, type NajmDesignConfig } from "najm-kit";
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
} from "../src/lib/factoryDesign";
import { loadAppearanceWith } from "../src/lib/appearanceLoader";
import {
  appearanceReducer,
  createInitialAppearanceState,
  selectResolvedDesign,
} from "../src/providers/appearanceReducer";
import type { PublicAppearance } from "../src/types/appearance";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function buildFactoryAppearance(
  revision: number = DEFAULT_APPEARANCE_REVISION,
): PublicAppearance {
  return { designConfig: getFactoryDesignConfig(), revision };
}

function changePrimary(
  appearance: PublicAppearance,
  color: string,
): PublicAppearance {
  return {
    ...appearance,
    designConfig: {
      ...appearance.designConfig,
      theme: {
        ...appearance.designConfig.theme,
        tokens: { ...appearance.designConfig.theme.tokens, primary: color },
      },
    },
  };
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

describe("appearance reducer", () => {
  test("begins a draft by cloning the committed design", () => {
    const initial = buildFactoryAppearance(4);
    const state = createInitialAppearanceState(initial);

    const draftStarted = appearanceReducer(state, { type: "begin_draft" });

    expect(draftStarted.draft).toEqual(state.committed.designConfig);
    expect(draftStarted.draft).not.toBe(state.committed.designConfig);
    expect(draftStarted.committed).toBe(state.committed);
  });

  test("is idempotent when beginDraft is called twice", () => {
    const initial = buildFactoryAppearance();
    const state = createInitialAppearanceState(initial);

    const first = appearanceReducer(state, { type: "begin_draft" });
    const second = appearanceReducer(first, { type: "begin_draft" });

    expect(second.draft).toBe(first.draft);
  });

  test("updates and clears the draft independently from the committed design", () => {
    const initial = buildFactoryAppearance();
    const state = createInitialAppearanceState(initial);
    const started = appearanceReducer(state, { type: "begin_draft" });
    const candidate = changePrimary(initial, "#126e45").designConfig;

    const updated = appearanceReducer(started, {
      type: "update_draft",
      design: candidate,
    });
    expect(updated.draft?.theme.tokens?.primary).toBe("#126e45");
    expect(updated.committed.designConfig.theme.tokens?.primary).not.toBe(
      "#126e45",
    );
    expect(updated.draft).not.toBe(candidate);

    const cleared = appearanceReducer(updated, { type: "clear_draft" });
    expect(cleared.draft).toBeNull();
    expect(cleared.committed).toBe(state.committed);
  });

  test("clearDraft is idempotent when no draft is active", () => {
    const initial = buildFactoryAppearance();
    const state = createInitialAppearanceState(initial);

    expect(appearanceReducer(state, { type: "clear_draft" })).toBe(state);
  });

  test("replace_committed swaps the committed appearance and drops any draft", () => {
    const initial = buildFactoryAppearance(2);
    const state = createInitialAppearanceState(initial);
    const started = appearanceReducer(state, { type: "begin_draft" });

    const next: PublicAppearance = {
      designConfig: changePrimary(initial, "#0f766e").designConfig,
      revision: 3,
    };

    const replaced = appearanceReducer(started, {
      type: "replace_committed",
      appearance: next,
    });

    expect(replaced.committed).toEqual(next);
    expect(replaced.draft).toBeNull();
  });

  test("selectResolvedDesign returns the draft when present and committed otherwise", () => {
    const initial = buildFactoryAppearance();
    const state = createInitialAppearanceState(initial);
    expect(selectResolvedDesign(state)).toBe(state.committed.designConfig);

    const started = appearanceReducer(state, { type: "begin_draft" });
    expect(started.draft).not.toBeNull();
    expect(selectResolvedDesign(started)).toBe(started.draft as NajmDesignConfig);

    const draft = started.draft as NajmDesignConfig;
    const candidate: NajmDesignConfig = {
      ...draft,
      theme: {
        ...draft.theme,
        tokens: { ...draft.theme.tokens, primary: "#abcdef" },
      },
    };
    const updated = appearanceReducer(started, {
      type: "update_draft",
      design: candidate,
    });
    expect(selectResolvedDesign(updated)?.theme.tokens?.primary).toBe("#abcdef");
  });
});

describe("appearance provider wiring", () => {
  test("KafilDesignProvider consumes the resolved appearance design and the personal mode", () => {
    const provider = readSource(
      "../src/providers/KafilDesignProvider.tsx",
    );
    expect(provider).toContain('"use client"');
    expect(provider).toContain("useKafilAppearance");
    expect(provider).toContain("useThemePreference");
    expect(provider).toContain("NajmDesignProvider");
    expect(provider).toContain("config={design}");
    expect(provider).toContain("mode={activeTheme}");
    expect(provider).not.toContain("parseNajmDesignConfig");
    expect(provider).not.toContain("theme.json");
  });

  test("KafilAppearanceProvider owns the committed design, revision, and draft commands", () => {
    const provider = readSource(
      "../src/providers/KafilAppearanceProvider.tsx",
    );
    expect(provider).toContain('"use client"');
    expect(provider).toContain("appearanceReducer");
    expect(provider).toContain("useAppearanceCommands");
    expect(provider).toContain("beginDraft");
    expect(provider).toContain("setDraft");
    expect(provider).toContain("cancelDraft");
    expect(provider).toContain("commitDraft");
    expect(provider).toContain("resetToFactory");
    expect(provider).toContain("useKafilAppearance");
  });

  test("AppProviders mounts KafilAppearanceProvider above KafilDesignProvider", () => {
    const appProviders = readSource("../src/providers/AppProviders.tsx");
    const appearanceIndex = appProviders.indexOf("KafilAppearanceProvider");
    const designIndex = appProviders.indexOf("KafilDesignProvider");
    expect(appearanceIndex).toBeGreaterThan(-1);
    expect(designIndex).toBeGreaterThan(appearanceIndex);
    expect(appProviders).toContain("initialAppearance={initialAppearance}");
  });

  test("root layout loads the appearance server-side with a factory fallback", () => {
    const layout = readSource("../src/app/layout.tsx");
    const serverHelper = readSource("../src/lib/serverAppearance.ts");
    const loader = readSource("../src/lib/appearanceLoader.ts");

    expect(layout).toContain("loadServerAppearance");
    expect(layout).toContain("initialAppearance={appearance}");
    expect(serverHelper).toContain("server.fetch");
    expect(serverHelper).toContain("loadAppearanceWith");
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
