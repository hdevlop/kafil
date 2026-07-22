"use client";

import { CircleDollarSign, Settings2 } from "lucide-react";
import {
  FormInput,
  NButton,
  NCard,
  NForm,
  NFormSectionHeader,
  NPageLayout,
} from "najm-kit";

import { devFormTools } from "@/lib/devFormFill";
import { formatMad } from "@/lib/format";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { DashboardPageHeader as NPageHeader } from "@/shared/DashboardShell/DashboardPageHeader";

import {
  fundingSettingFormSchema,
  fundingTargetDefaultValue,
  toFundingSettingInput,
  type FundingSettingFormValues,
} from "../config/settingSchemas";
import {
  useFundingSetting,
  useSettingCommands,
} from "../hooks/useSettings";

export function SettingsPage() {
  const setting = useFundingSetting();
  const { updateFunding } = useSettingCommands();

  async function handleSubmit(values: FundingSettingFormValues) {
    await updateFunding.mutateAsync(toFundingSettingInput(values));
  }

  if (setting.isPending) {
    return <NCard title="Loading settings" loading />;
  }
  if (setting.isError || !setting.data) {
    return (
      <NCard title="We could not load platform settings">
        <NButton variant="outline" onClick={() => void setting.refetch()}>
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
        subtitle="Set the default target offered for new family accounts."
        actions={<PageHeaderGlobalActions />}
      />
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
          devTools={devFormTools(fundingSettingFormSchema)}
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
