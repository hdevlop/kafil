"use client";

import {
  NThemePresets,
  toast,
  useNajmDesignEditor,
  type NThemePreset,
} from "najm-kit";
import { useMemo } from "react";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import { useThemePresetCommands, useThemePresets } from "@/hooks/useThemePresets";

export function ThemePresetsPanel({
  enabled,
  disabled,
  selectedPresetId,
  onSelectedPresetChange,
}: Readonly<{
  enabled: boolean;
  disabled?: boolean;
  selectedPresetId: string | null;
  onSelectedPresetChange: (presetId: string | null) => void;
}>) {
  const { t } = useKafilLanguage();
  const { committed, draft, setDraft, cancelDraft, beginDraft } =
    useNajmDesignEditor()!;
  const { data: presets, isLoading, isError } = useThemePresets(enabled);
  const { createPreset, deletePreset } = useThemePresetCommands();

  const items = useMemo<NThemePreset[]>(
    () =>
      (presets ?? []).map((preset) => ({
        id: preset.id,
        name: preset.name,
        design: preset.designConfig,
        isBuiltIn: preset.isBuiltIn,
      })),
    [presets],
  );

  function handleSelect(preset: NThemePreset | null) {
    if (!preset) {
      onSelectedPresetChange(null);
      cancelDraft();
      beginDraft();
      toast.success(t("operator.settings.presets.revertDone"));
      return;
    }

    onSelectedPresetChange(preset.id);
    // Purely in-memory: the whole app re-renders through this draft, and
    // nothing reaches the server until the sheet's save button is pressed.
    setDraft(preset.design);
  }

  async function handleSave(name: string) {
    const created = await createPreset.mutateAsync({
      name,
      designConfig: draft ?? committed,
    });
    onSelectedPresetChange(created.id);
    toast.success(t("operator.settings.presets.saveSuccess", { name }));
  }

  async function handleDelete(preset: NThemePreset) {
    await deletePreset.mutateAsync(preset.id);
    // Only drop the selection when the deleted theme was the loaded one.
    if (selectedPresetId === preset.id) onSelectedPresetChange(null);
    toast.success(
      t("operator.settings.presets.deleteSuccess", { name: preset.name }),
    );
  }

  return (
    <NThemePresets
      presets={items}
      selectedPresetId={selectedPresetId}
      savedDesign={committed}
      status={isError ? "error" : isLoading ? "loading" : "idle"}
      onSelect={handleSelect}
      onSave={handleSave}
      onDelete={handleDelete}
      disabled={disabled}
      labels={{
        title: t("operator.settings.presets.title"),
        description: t("operator.settings.presets.description"),
        empty: t("operator.settings.presets.empty"),
        loadError: t("operator.settings.presets.loadError"),
        select: t("operator.settings.presets.select"),
        selectPlaceholder: t("operator.settings.presets.selectPlaceholder"),
        savedOption: t("operator.settings.presets.savedOption"),
        saveCurrent: t("operator.settings.presets.saveCurrent"),
        saveTitle: t("operator.settings.presets.saveTitle"),
        saveDescription: t("operator.settings.presets.saveDescription"),
        saveAction: t("operator.settings.presets.saveAction"),
        nameLabel: t("operator.settings.presets.nameLabel"),
        namePlaceholder: t("operator.settings.presets.namePlaceholder"),
        delete: t("operator.settings.presets.delete"),
        deleteTitle: t("operator.settings.presets.deleteTitle"),
        deleteDescription: t("operator.settings.presets.deleteDescription"),
        cancel: t("operator.settings.cancel"),
      }}
    />
  );
}
