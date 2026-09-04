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
import { useEffect } from "react";

import { useTranslation } from "najm-i18n/react";

import {
  settingsFormDefault,
  settingsFormSchema,
  toSettingsInput,
  type SettingsFormValues,
} from "../config/settingSchemas";
import { usePlatformSettings, useSettingCommands } from "../hooks/useSettings";

export const APP_SETTINGS_FORM_ID = "platform-settings-form";

/**
 * Kafil's own platform settings: the funding target, the contribution expiry
 * window, the form-fill shortcut, and the display time zone.
 *
 * Branding used to be saved from here, which coupled a Kafil product form to
 * an asset lifecycle. It now has its own `najm-theme` sheet and save action.
 * One failure no longer reports the other as rolled back when it committed.
 */
export function AppSettingsPanel({
  onStateChange,
}: Readonly<{
  onStateChange?: (state: { dirty: boolean; saving: boolean }) => void;
  role?: string | null;
}>) {
  const setting = usePlatformSettings();
  const { updateSettings } = useSettingCommands();
  const { t } = useTranslation();
  const { timeZone, setTimeZone } = useNajmTimeZone();
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
    if (!form.formState.isDirty) return;

    const updated = await updateSettings.mutateAsync(toSettingsInput(values));
    if (values.timeZone !== timeZone) {
      await setTimeZone(values.timeZone);
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
    </div>
  );
}
