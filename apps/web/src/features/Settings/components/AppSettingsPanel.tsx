"use client";

import {
  FormInput,
  NButton,
  NCard,
  NForm,
  toast,
  useNForm,
  useNajmTimeZone,
} from "najm-kit";
import { useEffect, useState } from "react";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";

import { useBrandingEditor } from "../hooks/BrandingEditor";
import {
  settingsFormDefault,
  settingsFormSchema,
  toSettingsInput,
  type SettingsFormValues,
} from "../config/settingSchemas";
import { usePlatformSettings, useSettingCommands } from "../hooks/useSettings";
import { BrandAssetsPanel } from "./BrandAssetsPanel";

export const APP_SETTINGS_FORM_ID = "platform-settings-form";

export function AppSettingsPanel({
  onStateChange,
}: Readonly<{
  onStateChange?: (state: { dirty: boolean; saving: boolean }) => void;
  role?: string | null;
}>) {
  const setting = usePlatformSettings();
  const { updateSettings } = useSettingCommands();
  const branding = useBrandingEditor();
  const { t } = useKafilLanguage();
  const { timeZone, setTimeZone } = useNajmTimeZone();
  const form = useNForm({ schema: settingsFormSchema });
  const [savingBranding, setSavingBranding] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);

  useEffect(() => {
    if (setting.data) form.reset(settingsFormDefault(setting.data, timeZone));
  }, [form, setting.data, timeZone]);

  useEffect(() => {
    const combinedDirty = form.formState.isDirty || branding.isDirty;
    const pending =
      updateSettings.isPending || savingBranding || uploadingCount > 0;
    onStateChange?.({
      dirty: combinedDirty,
      saving: pending,
    });
  }, [
    branding.isDirty,
    form.formState.isDirty,
    onStateChange,
    savingBranding,
    updateSettings.isPending,
    uploadingCount,
  ]);

  async function handleSubmit(values: SettingsFormValues) {
    let brandingError: unknown = null;
    if (branding.isAdmin && branding.isDirty) {
      setSavingBranding(true);
      try {
        await branding.commitDraft();
        toast.success(t("operator.settings.branding.saveSuccess"));
      } catch (error) {
        brandingError = error;
        toast.error(
          error instanceof Error
            ? error.message
            : t("operator.settings.branding.saveError"),
        );
      } finally {
        setSavingBranding(false);
      }
    }

    if (!form.formState.isDirty && brandingError) {
      return;
    }

    if (form.formState.isDirty) {
      const updated = await updateSettings.mutateAsync(toSettingsInput(values));
      if (values.timeZone !== timeZone) {
        await setTimeZone(values.timeZone);
        toast.success(t("display.timeZone.saved"));
      }
      form.reset(settingsFormDefault(updated, values.timeZone));
    }
  }

  if (setting.isPending) {
    return <NCard title={t("operator.settings.loading")} loading />;
  }
  if (setting.isError || !setting.data) {
    return (
      <NCard title={t("operator.settings.loadError")}>
        <NButton variant="outline" onClick={() => void setting.refetch()}>
          {t("action.retry")}
        </NButton>
      </NCard>
    );
  }

  return (
    <div className="space-y-6">
      <NForm
        id={APP_SETTINGS_FORM_ID}
        schema={settingsFormSchema}
        form={form}
        onSubmit={handleSubmit}
      >
        <FormInput
          name="formFillEnabled"
          type="switch"
          formLabel={t("operator.settings.shortcutLabel")}
          label={t("operator.settings.shortcutControl")}
        />
        <FormInput
          name="targetMad"
          type="text"
          formLabel={t("operator.settings.targetLabel")}
          placeholder={t("operator.settings.targetPlaceholder")}
          icon="CircleDollarSign"
          required
        />
        <FormInput
          name="pendingContributionExpiryHours"
          type="number"
          formLabel={t("operator.settings.expiryLabel")}
          placeholder={t("operator.settings.expiryPlaceholder")}
          icon="Clock"
          required
        />

        <FormInput
          name="timeZone"
          type="timeZone"
          formLabel={t("display.timeZone.label")}
        />
      </NForm>
      {branding.isAdmin ? (
        <BrandAssetsPanel
          onStateChange={(state) => setUploadingCount(state.uploading)}
        />
      ) : null}
      {uploadingCount > 0 ? (
        <p className="text-center text-xs text-muted-foreground">
          {t("operator.settings.branding.uploadingCount", {
            count: uploadingCount,
          })}
        </p>
      ) : null}
    </div>
  );
}
