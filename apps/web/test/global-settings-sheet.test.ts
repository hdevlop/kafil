import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import {
  canOpenGlobalSettings,
  getGlobalSettingsTabs,
} from "../src/features/Settings/components/GlobalSettingsSheet";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("global settings sheet", () => {
  test("exposes settings and theme controls by role", () => {
    expect(canOpenGlobalSettings("admin")).toBe(true);
    expect(canOpenGlobalSettings("operator")).toBe(true);
    expect(canOpenGlobalSettings("family")).toBe(false);
    expect(canOpenGlobalSettings("sponsor")).toBe(false);
    expect(getGlobalSettingsTabs("admin")).toEqual(["theme", "app"]);
    expect(getGlobalSettingsTabs("operator")).toEqual(["app"]);
    expect(getGlobalSettingsTabs("family")).toEqual([]);
  });

  test("renders direct Najm theme content with host-owned file and save actions", () => {
    const sheet = readSource("../src/features/Settings/components/GlobalSettingsSheet.tsx");
    const theme = readSource("../src/features/Settings/components/ThemeSettingsPanel.tsx");

    expect(sheet).toContain("<NSheet");
    expect(sheet).toContain("icon={SlidersHorizontal}");
    expect(sheet).toContain("APP_SETTINGS_FORM_ID");
    expect(sheet).toContain("themeDirty || appState.dirty");
    expect(sheet).toContain("<NConfirmDialog");
    expect(theme).toContain('tabs={["theme"]}');
    expect(theme).toContain("showTabs={false}");
    expect(theme).toContain("showFileActions={false}");
    expect(theme).toContain("showResetAction={false}");
    expect(theme).not.toContain("showPreviewMode");
    expect(theme).not.toContain("previewMode=");
    expect(sheet).toContain("parseThemeFile");
    expect(sheet).toContain("stringifyThemeFile");
    expect(sheet).toContain('aria-label="Import theme"');
    expect(sheet).toContain('aria-label="Export theme"');
    expect(sheet).toContain("<RotateCcw");
    expect(sheet).toContain("<Save");
    expect(theme).not.toContain("<select");
    expect(theme).not.toContain("theme-preview-mode");
    expect(theme).not.toContain("typography");
  });

  test("reuses one app settings panel for the sheet and deep link", () => {
    const panel = readSource("../src/features/Settings/components/AppSettingsPanel.tsx");
    const page = readSource("../src/features/Settings/components/SettingsPage.tsx");
    const shell = readSource("../src/shared/DashboardShell/index.tsx");
    const sheet = readSource("../src/features/Settings/components/GlobalSettingsSheet.tsx");

    expect(panel.match(/settingsFormSchema/g)?.length).toBeGreaterThan(1);
    expect(panel).toContain("useSettingCommands");
    expect(panel).toContain("form={form}");
    expect(panel).toContain('branding.isAdmin');
    expect(panel).toContain("<BrandAssetsPanel");
    expect(page).toContain("<GlobalSettingsSheet");
    expect(shell).toContain("<GlobalSettingsSheet");
    expect(shell).toContain("canOpenGlobalSettings(user.role)");
    expect(sheet).toContain("branding.isDirty");
    expect(sheet).toContain("branding.cancelDraft");
  });
});
