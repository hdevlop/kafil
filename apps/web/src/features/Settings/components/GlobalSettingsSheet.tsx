"use client";

import { NButton, NConfirmDialog, NSheet, NTabs } from "najm-kit";
import { Save, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  NThemeAppearanceSettings,
  NThemeBrandingSettings,
  NThemePresetSettings,
  NThemeSettingsActions,
  NThemeSettingsProvider,
  useNThemeSettingsOptional,
} from "najm-theme/react";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import { authorizationHeaders } from "@/services/http";

import { APP_SETTINGS_FORM_ID, AppSettingsPanel } from "./AppSettingsPanel";

/**
 * Kafil mounts the plugin at its server base, so the routes are `/api/appearance`
 * and `/api/branding` rather than `/api/theme/…`.
 *
 * `headers` is the one thing the package cannot infer: Kafil authenticates with
 * a bearer token from `auth.client`, not with a cookie, so a client sending
 * credentials alone would be anonymous on every administrative route.
 */
const THEME_CLIENT = {
  baseUrl: "/api",
  credentials: "include" as const,
  headers: authorizationHeaders,
};

export type GlobalSettingsTab = "theme" | "app";

export function canOpenGlobalSettings(role: string | null | undefined) {
  return role === "admin" || role === "operator";
}

export function getGlobalSettingsTabs(role: string | null | undefined): GlobalSettingsTab[] {
  if (role === "admin") return ["theme", "app"];
  if (role === "operator") return ["app"];
  return [];
}

/**
 * Kafil's settings surface, composed from `najm-theme` components.
 *
 * `NThemeSettingsProvider` owns the whole theme state machine — queries, query
 * keys, drafts, dirty tracking, candidate uploads, revision conflicts, and the
 * live hand-off to `NajmAppProvider`'s design and branding runtimes. What is
 * left in this file is Kafil composition: which tabs exist for which role, and
 * that the app tab is Kafil's own settings form rather than a package section.
 *
 * The provider is mounted here rather than at the app root deliberately. Its
 * queries hit administrative endpoints, and mounting it globally would fire
 * them on first paint of every family and sponsor session for a sheet those
 * roles can never open.
 */
export function GlobalSettingsSheet(
  props: Readonly<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    role: string | null | undefined;
  }>,
) {
  const { language } = useKafilLanguage();
  const router = useRouter();

  if (!canOpenGlobalSettings(props.role)) return null;

  // Operators have no theme tab, so they get no provider and no administrative
  // request. Not rendering the tab is presentation; the guard on
  // `/api/appearance/config` is the authorization boundary.
  if (props.role !== "admin") return <GlobalSettings {...props} />;

  return (
    <NThemeSettingsProvider
      client={THEME_CLIENT}
      language={language}
      /**
       * The client providers already show the change. This is for the
       * server-rendered half: the sign-in and first-login layouts read the
       * request snapshot, and without a refresh they would keep the previous
       * marks until the next full navigation.
       */
      onPersisted={() => router.refresh()}
    >
      <GlobalSettings {...props} />
    </NThemeSettingsProvider>
  );
}

function GlobalSettings({
  open,
  onOpenChange,
  role,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: string | null | undefined;
}>) {
  const { t } = useKafilLanguage();
  const theme = useNThemeSettingsOptional();
  const tabs = useMemo(() => getGlobalSettingsTabs(role), [role]);
  const [activeTab, setActiveTab] = useState<GlobalSettingsTab>(
    getGlobalSettingsTabs(role)[0] ?? "app",
  );
  const [appState, setAppState] = useState({ dirty: false, saving: false });
  const [confirmClose, setConfirmClose] = useState(false);

  /**
   * A previewed appearance is deliberately kept when the sheet closes so the
   * admin can browse the app before deciding — it lives in the kit's design
   * runtime and survives the unmount. Unsaved *branding* cannot: its previews
   * are object URLs over uploads nobody has committed. So branding, and
   * Kafil's own app form, are what block a close.
   */
  const dirty = appState.dirty || (theme?.dirty.branding ?? false);

  const themeCustomizerLabels = useMemo(
    () => ({
      themeTab: t("operator.settings.themeTab"),
      resetField: t("operator.settings.resetField"),
      resetSection: t("operator.settings.resetSection"),
      themeSection: t("operator.settings.themeSection"),
      layoutSubsection: t("operator.settings.layoutSection"),
      pageHeaderSubsection: t("operator.settings.pageHeaderSection"),
      sidebarSubsection: t("operator.settings.sidebarSection"),
      tableSubsection: t("operator.settings.tableSection"),
      inputSubsection: t("operator.settings.inputSection"),
    }),
    [t],
  );

  const tabItems = useMemo(
    () =>
      tabs.map((tab) => ({
        value: tab,
        label: t(
          tab === "theme" ? "operator.settings.themeTab" : "operator.settings.appTab",
        ),
        content:
          tab === "theme" ? (
            <div className="flex flex-col gap-4">
              <NThemePresetSettings showApplyAction={false} />
              {/* Kafil edits the theme group only, as it always has. The
                  customizer's Typography tab is a wider editable surface than
                  this product has ever exposed, and widening it is a product
                  decision rather than a consequence of adopting the package. */}
              <NThemeAppearanceSettings
                tabs={["theme"]}
                showTabs={false}
                showFileActions={false}
                showResetAction={false}
                customizerLabels={themeCustomizerLabels}
              />
              <NThemeBrandingSettings />
            </div>
          ) : (
            <AppSettingsPanel onStateChange={setAppState} role={role} />
          ),
      })),
    [role, t, tabs, themeCustomizerLabels],
  );

  function closeNow() {
    // The appearance draft intentionally survives: it is the live preview.
    // Branding candidates do not, and `discardDrafts` deletes their uploads.
    if (theme?.dirty.branding) void theme.discardDrafts();
    setActiveTab(tabs[0] ?? "app");
    setAppState({ dirty: false, saving: false });
    setConfirmClose(false);
    onOpenChange(false);
  }

  function requestOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }
    if (dirty) {
      setConfirmClose(true);
      return;
    }
    closeNow();
  }

  const themeActive = activeTab === "theme";

  return (
    <>
      <NSheet
        classNames={{ body: "px-4", content: "bg-background" }}
        open={open}
        onOpenChange={requestOpenChange}
        icon={SlidersHorizontal}
        title={t("operator.settings.sheetTitle")}
        description={t("operator.settings.sheetDescription")}
        width={500}
        footer={
          themeActive ? (
            <NThemeSettingsActions
              className="najm-theme-actions--sheet-footer"
              display="compact"
              showStatus={false}
              showFileActions
              showDiscard={false}
            />
          ) : (
            <div className="flex w-full items-center justify-end gap-3">
              <NButton
                type="submit"
                form={APP_SETTINGS_FORM_ID}
                size="icon-sm"
                aria-label={t("operator.settings.save")}
                title={t("operator.settings.save")}
                disabled={appState.saving}
              >
                <Save />
              </NButton>
            </div>
          )
        }
      >
        <NTabs
          items={tabItems}
          value={activeTab}
          onValueChange={setActiveTab}
          fullWidth
          classNames={{ content: "pt-1" }}
        />
      </NSheet>
      <NConfirmDialog
        open={confirmClose}
        onOpenChange={setConfirmClose}
        title={t("operator.settings.discardTitle")}
        description={t("operator.settings.discardDescription")}
        confirmLabel={t("operator.settings.discard")}
        cancelLabel={t("operator.settings.cancel")}
        variant="destructive"
        onConfirm={closeNow}
      />
    </>
  );
}
