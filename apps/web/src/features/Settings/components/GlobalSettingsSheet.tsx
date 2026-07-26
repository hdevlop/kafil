"use client";

import {
  NButton,
  NConfirmDialog,
  NSheet,
  NTabs,
  parseThemeFile,
  stringifyThemeFile,
  toast,
} from "najm-kit";
import { Download, RotateCcw, Save, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { useKafilAppearance } from "@/providers/KafilAppearanceProvider";

import { APP_SETTINGS_FORM_ID, AppSettingsPanel } from "./AppSettingsPanel";
import { ThemeSettingsPanel } from "./ThemeSettingsPanel";

export type GlobalSettingsTab = "theme" | "app";

export function canOpenGlobalSettings(role: string | null | undefined) {
  return role === "admin" || role === "operator";
}

export function getGlobalSettingsTabs(role: string | null | undefined): GlobalSettingsTab[] {
  if (role === "admin") return ["theme", "app"];
  if (role === "operator") return ["app"];
  return [];
}

export function GlobalSettingsSheet({
  open,
  onOpenChange,
  role,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: string | null | undefined;
}>) {
  const { t } = useKafilLanguage();
  const {
    appearance,
    draft,
    beginDraft,
    setDraft,
    cancelDraft,
    commitDraft,
    resetToFactory,
  } = useKafilAppearance();
  const tabs = useMemo(() => getGlobalSettingsTabs(role), [role]);
  const [activeTab, setActiveTab] = useState<GlobalSettingsTab>(
    getGlobalSettingsTabs(role)[0] ?? "app",
  );
  const themeFileInputRef = useRef<HTMLInputElement>(null);
  const [appState, setAppState] = useState({ dirty: false, saving: false });
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const themeDirty = Boolean(
    draft && JSON.stringify(draft) !== JSON.stringify(appearance.designConfig),
  );
  const dirty = themeDirty || appState.dirty;

  useEffect(() => {
    if (open && role === "admin") beginDraft();
  }, [beginDraft, open, role]);

  const tabItems = useMemo(
    () => tabs.map((tab) => ({
      value: tab,
      label: t(tab === "theme" ? "operator.settings.themeTab" : "operator.settings.appTab"),
      content: tab === "theme" && draft ? (
        <ThemeSettingsPanel
          value={draft}
          onChange={setDraft}
          disabled={isSavingTheme}
        />
      ) : (
        <AppSettingsPanel onStateChange={setAppState} />
      ),
    })),
    [draft, isSavingTheme, setDraft, t, tabs],
  );

  function closeNow() {
    cancelDraft();
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

  async function saveTheme() {
    if (!draft || !themeDirty) return;
    setIsSavingTheme(true);
    try {
      await commitDraft({
        designConfig: draft,
        expectedRevision: appearance.revision,
      });
      beginDraft();
      toast.success(t("operator.settings.themeSaveSuccess"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("operator.settings.themeSaveError"));
    } finally {
      setIsSavingTheme(false);
    }
  }

  async function resetTheme() {
    setIsSavingTheme(true);
    try {
      await resetToFactory({ expectedRevision: appearance.revision });
      beginDraft();
      setConfirmReset(false);
      toast.success(t("operator.settings.themeResetSuccess"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("operator.settings.themeResetError"));
    } finally {
      setIsSavingTheme(false);
    }
  }

  async function importTheme(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    try {
      setDraft(parseThemeFile(await file.text()));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid theme file");
    }
  }

  function exportTheme() {
    const design = draft ?? appearance.designConfig;
    const url = URL.createObjectURL(
      new Blob([stringifyThemeFile(design)], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "kafil-theme.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (!canOpenGlobalSettings(role)) return null;

  const themeActive = activeTab === "theme";
  const pending = themeActive ? isSavingTheme : appState.saving;

  return (
    <>
      <NSheet
        open={open}
        onOpenChange={requestOpenChange}
        title={t("operator.settings.sheetTitle")}
        description={t("operator.settings.sheetDescription")}
        width={500}
        contentClassName="bg-background"
        bodyClassName="px-4"
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            {themeActive ? (
              <div className="flex items-center gap-2">
                <input
                  ref={themeFileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="sr-only"
                  disabled={pending}
                  onChange={(event) => void importTheme(event)}
                />
                <NButton
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Import theme"
                  title="Import theme"
                  disabled={pending}
                  onClick={() => themeFileInputRef.current?.click()}
                >
                  <Upload />
                </NButton>
                <NButton
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Export theme"
                  title="Export theme"
                  disabled={pending}
                  onClick={exportTheme}
                >
                  <Download />
                </NButton>
                <NButton
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label={t("operator.settings.resetTheme")}
                  title={t("operator.settings.resetTheme")}
                  disabled={pending}
                  onClick={() => setConfirmReset(true)}
                >
                  <RotateCcw />
                </NButton>
              </div>
            ) : (
              <span />
            )}
            {themeActive ? (
              <NButton
                type="button"
                size="icon-sm"
                aria-label={t("operator.settings.saveTheme")}
                title={t("operator.settings.saveTheme")}
                disabled={!themeDirty || pending}
                onClick={() => void saveTheme()}
              >
                <Save />
              </NButton>
            ) : (
              <NButton
                type="submit"
                form={APP_SETTINGS_FORM_ID}
                size="icon-sm"
                aria-label={t("operator.settings.save")}
                title={t("operator.settings.save")}
                disabled={pending}
              >
                <Save />
              </NButton>
            )}
          </div>
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
      <NConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title={t("operator.settings.resetThemeTitle")}
        description={t("operator.settings.resetThemeDescription")}
        confirmLabel={t("operator.settings.resetTheme")}
        cancelLabel={t("operator.settings.cancel")}
        variant="destructive"
        loading={isSavingTheme}
        onConfirm={() => void resetTheme()}
      />
    </>
  );
}
