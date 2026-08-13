"use client";

import { NButton, NConfirmDialog, NSheet } from "najm-kit";
import { ImageIcon, Palette, Save, Settings2 } from "lucide-react";
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
 * and `/api/branding` rather than `/api/theme/...`.
 *
 * `headers` stays a function because Kafil authenticates administrative theme
 * requests with the current bearer token rather than a server cookie.
 */
const THEME_CLIENT = {
  baseUrl: "/api",
  credentials: "include" as const,
  headers: authorizationHeaders,
};

export type SettingsSheetKind = "app" | "theme" | "branding";

export function canOpenAppSettings(role: string | null | undefined) {
  return role === "admin" || role === "operator";
}

export function canOpenThemeSettings(role: string | null | undefined) {
  return role === "admin";
}

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppSettingsSheet({
  open,
  onOpenChange,
  role,
}: Readonly<SheetProps & { role: string | null | undefined }>) {
  const { t } = useKafilLanguage();
  const [appState, setAppState] = useState({ dirty: false, saving: false });
  const [confirmClose, setConfirmClose] = useState(false);

  if (!canOpenAppSettings(role)) return null;

  function closeNow() {
    setAppState({ dirty: false, saving: false });
    setConfirmClose(false);
    onOpenChange(false);
  }

  function requestOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }
    if (appState.dirty) {
      setConfirmClose(true);
      return;
    }
    closeNow();
  }

  return (
    <>
      <NSheet
        classNames={{ body: "px-4", content: "bg-background" }}
        open={open}
        onOpenChange={requestOpenChange}
        icon={Settings2}
        title={t("operator.settings.appTab")}
        description={t("operator.settings.appSheetDescription")}
        width={500}
        footer={
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
        }
      >
        <AppSettingsPanel onStateChange={setAppState} role={role} />
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

function ThemeSettingsSheet({ open, onOpenChange }: Readonly<SheetProps>) {
  const { t } = useKafilLanguage();
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

  return (
    <NSheet
      classNames={{ body: "px-4", content: "bg-background" }}
      open={open}
      onOpenChange={onOpenChange}
      icon={Palette}
      title={t("operator.settings.themeTab")}
      description={t("operator.settings.themeSheetDescription")}
      width={500}
      footer={
        <NThemeSettingsActions
          className="najm-theme-actions--sheet-footer"
          resources={["appearance"]}
          display="compact"
          showStatus={false}
          showFileActions
          showDiscard={false}
        />
      }
    >
      <div className="flex flex-col gap-4">
        <NThemePresetSettings showApplyAction={false} />
        <NThemeAppearanceSettings
          tabs={["theme"]}
          showTabs={false}
          showFileActions={false}
          showResetAction={false}
          customizerLabels={themeCustomizerLabels}
        />
      </div>
    </NSheet>
  );
}

function BrandingSettingsSheet({ open, onOpenChange }: Readonly<SheetProps>) {
  const { t } = useKafilLanguage();
  const theme = useNThemeSettingsOptional();
  const [confirmClose, setConfirmClose] = useState(false);

  function closeNow() {
    // The package owns candidate cleanup. Its discard operation resets every
    // unsaved theme draft, matching the previous combined-sheet close path.
    if (theme?.dirty.branding) void theme.discardDrafts();
    setConfirmClose(false);
    onOpenChange(false);
  }

  function requestOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }
    if (theme?.dirty.branding) {
      setConfirmClose(true);
      return;
    }
    closeNow();
  }

  return (
    <>
      <NSheet
        classNames={{ body: "px-4", content: "bg-background" }}
        open={open}
        onOpenChange={requestOpenChange}
        icon={ImageIcon}
        title={t("nav.branding")}
        description={t("operator.settings.brandingSheetDescription")}
        width={500}
        footer={
          <NThemeSettingsActions
            className="najm-theme-actions--sheet-footer"
            resources={["branding"]}
            display="compact"
            showStatus={false}
            showDiscard={false}
          />
        }
      >
        <NThemeBrandingSettings />
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

/**
 * One admin-only persistence provider owns both theme sheets. Keeping it above
 * the two surfaces preserves drafts when the administrator switches between
 * Theme and Branding and avoids duplicate query clients or revision state.
 */
export function AdminThemeSettingsSheets({
  activeSheet,
  onActiveSheetChange,
  role,
}: Readonly<{
  activeSheet: SettingsSheetKind | null;
  onActiveSheetChange: (sheet: SettingsSheetKind | null) => void;
  role: string | null | undefined;
}>) {
  const { language } = useKafilLanguage();
  const router = useRouter();

  if (!canOpenThemeSettings(role)) return null;

  return (
    <NThemeSettingsProvider
      client={THEME_CLIENT}
      language={language}
      onPersisted={() => router.refresh()}
    >
      <ThemeSettingsSheet
        open={activeSheet === "theme"}
        onOpenChange={(open) => onActiveSheetChange(open ? "theme" : null)}
      />
      <BrandingSettingsSheet
        open={activeSheet === "branding"}
        onOpenChange={(open) => onActiveSheetChange(open ? "branding" : null)}
      />
    </NThemeSettingsProvider>
  );
}
