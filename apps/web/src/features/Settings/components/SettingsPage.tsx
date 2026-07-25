"use client";

import { CircleDollarSign, Keyboard, Settings2 } from "lucide-react";
import {
  FormInput,
  NButton,
  NCard,
  NForm,
  NFormSectionHeader,
  NPageLayout,
} from "najm-kit";

import { useDevFormTools } from "@/lib/devFormFill";
import { formatMad } from "@/lib/format";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { DashboardPageHeader as NPageHeader } from "@/shared/DashboardShell/DashboardPageHeader";

import {
  formFillSettingFormSchema,
  fundingSettingFormSchema,
  fundingTargetDefaultValue,
  toFormFillSettingInput,
  toFundingSettingInput,
  type FormFillSettingFormValues,
  type FundingSettingFormValues,
} from "../config/settingSchemas";
import {
  useFormFillSetting,
  useFundingSetting,
  useSettingCommands,
} from "../hooks/useSettings";

export function SettingsPage() {
  const setting = useFundingSetting();
  const formFillSetting = useFormFillSetting();
  const { updateFormFill, updateFunding } = useSettingCommands();
  const fundingDevTools = useDevFormTools(fundingSettingFormSchema);

  async function handleSubmit(values: FundingSettingFormValues) {
    await updateFunding.mutateAsync(toFundingSettingInput(values));
  }

  async function handleFormFillSubmit(values: FormFillSettingFormValues) {
    await updateFormFill.mutateAsync(toFormFillSettingInput(values));
  }

  if (setting.isPending || formFillSetting.isPending) {
    return <NCard title="Loading settings" loading />;
  }
  if (
    setting.isError ||
    !setting.data ||
    formFillSetting.isError ||
    !formFillSetting.data
  ) {
    return (
      <NCard title="We could not load platform settings">
        <NButton
          variant="outline"
          onClick={() =>
            void Promise.all([setting.refetch(), formFillSetting.refetch()])
          }
        >
          Try again
        </NButton>
      </NCard>
    );
  }

  return (
    <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
      <NPageHeader
        icon={Settings2}
        title="Platform settings"
        subtitle="Manage platform defaults and operator productivity tools."
        actions={<PageHeaderGlobalActions />}
      />
      <NCard
        title="F8 fake-data form fill"
        description={
          formFillSetting.data.enabled
            ? "The F8 shortcut is currently enabled for browser forms."
            : "The F8 shortcut is disabled by default."
        }
      >
        <NForm
          key={String(formFillSetting.data.enabled)}
          id="form-fill-setting-form"
          schema={formFillSettingFormSchema}
          defaultValues={{
            enabled: formFillSetting.data.enabled,
            reason: "",
          }}
          onSubmit={handleFormFillSubmit}
          className="space-y-5"
        >
          <NFormSectionHeader icon={Keyboard} title="Browser form shortcut" />
          <p className="text-sm text-muted-foreground">
            Enable this only when fake values are useful. The change is
            immediate and does not require rebuilding or restarting Docker.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <FormInput
              name="enabled"
              type="switch"
              formLabel="Enable F8 fake-data fill"
              label="Allow F8 to fill supported forms"
              helper="Disabled by default."
            />
            <FormInput
              name="reason"
              type="textarea"
              formLabel="Reason"
              placeholder="Why is the F8 shortcut changing?"
              icon="MessageSquareText"
              required
            />
          </div>
          <div className="flex justify-end">
            <NButton type="submit" disabled={updateFormFill.isPending}>
              {updateFormFill.isPending ? "Saving..." : "Save F8 setting"}
            </NButton>
          </div>
        </NForm>
      </NCard>
      <NCard
        title="Default family activation target"
        description={`New families can override this default. Current default: ${formatMad(setting.data.familyFundingTargetMinor)}`}
      >
        <NForm
          id="family-funding-setting-form"
          schema={fundingSettingFormSchema}
          defaultValues={{
            targetMad: fundingTargetDefaultValue(
              setting.data.familyFundingTargetMinor,
            ),
            reason: "",
          }}
          onSubmit={handleSubmit}
          devTools={fundingDevTools}
          className="space-y-5"
        >
          <NFormSectionHeader
            icon={CircleDollarSign}
            title="New-family target default"
          />
          <p className="text-sm text-muted-foreground">
            Each family stores its own target. This value is only the default
            for a new family when an API caller does not provide one.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <FormInput
              name="targetMad"
              type="text"
              formLabel="Default target (MAD)"
              placeholder="Enter a default activation target"
              icon="CircleDollarSign"
              required
            />
            <FormInput
              name="reason"
              type="textarea"
              formLabel="Reason"
              placeholder="Why is the default target changing?"
              icon="MessageSquareText"
              required
            />
          </div>
          <div className="flex justify-end">
            <NButton type="submit" disabled={updateFunding.isPending}>
              {updateFunding.isPending ? "Saving..." : "Save default target"}
            </NButton>
          </div>
        </NForm>
      </NCard>
    </NPageLayout>
  );
}
