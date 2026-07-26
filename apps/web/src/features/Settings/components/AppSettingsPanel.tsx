"use client";

import {
  FormInput,
  NButton,
  NCard,
  NForm,
  toast,
  useNForm,
} from "najm-kit";
import { useEffect } from "react";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { useDevFormTools } from "@/lib/devFormFill";
import type { KafilTimeZone } from "@/lib/format";
import { useKafilTimeZone } from "@/providers/TimeZonePreferenceProvider";

import {
  settingsFormDefault,
  settingsFormSchema,
  toSettingsInput,
  type SettingsFormValues,
} from "../config/settingSchemas";
import { usePlatformSettings, useSettingCommands } from "../hooks/useSettings";

export const APP_SETTINGS_FORM_ID = "platform-settings-form";

export function AppSettingsPanel({
  onStateChange,
}: Readonly<{
  onStateChange?: (state: { dirty: boolean; saving: boolean }) => void;
}>) {
  const setting = usePlatformSettings();
  const { updateSettings } = useSettingCommands();
  const devTools = useDevFormTools(settingsFormSchema);
  const { t } = useKafilLanguage();
  const { timeZone, setTimeZone } = useKafilTimeZone();
  const form = useNForm({ schema: settingsFormSchema });

  useEffect(() => {
    if (setting.data) form.reset(settingsFormDefault(setting.data, timeZone));
  }, [form, setting.data, timeZone]);

  useEffect(() => {
    onStateChange?.({
      dirty: form.formState.isDirty,
      saving: updateSettings.isPending,
    });
  }, [form.formState.isDirty, onStateChange, updateSettings.isPending]);

  async function handleSubmit(values: SettingsFormValues) {
    const updated = await updateSettings.mutateAsync(toSettingsInput(values));
    if (values.timeZone !== timeZone) {
      await setTimeZone(values.timeZone as KafilTimeZone);
      toast.success(t("display.timeZone.saved"));
    }
    form.reset(settingsFormDefault(updated, values.timeZone));
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
    <NForm
      id={APP_SETTINGS_FORM_ID}
      schema={settingsFormSchema}
      form={form}
      onSubmit={handleSubmit}
      devTools={devTools}
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
  );
}
