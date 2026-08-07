"use client";

import { HeartHandshake } from "lucide-react";
import { FormInput, NButton, NForm, NFormSectionHeader, useDebouncedValue, useDialog } from "najm-kit";
import { useState } from "react";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import { useDevFormTools } from "@/lib/devFormFill";

import {
  createSupportAssignmentFormSchema,
  endSupportAssignmentFormSchema,
  toCreateSupportAssignmentInput,
  toUpdateSupportAssignmentNotesInput,
  updateSupportAssignmentNotesFormSchema,
  type CreateSupportAssignmentFormValues,
  type EndSupportAssignmentFormValues,
  type UpdateSupportAssignmentNotesFormValues,
} from "../config/supportAssignmentSchemas";
import {
  useSupportAssignmentCommands,
  useSupportAssignmentSources,
} from "../hooks/useSupportAssignments";
import type { SupportAssignmentView } from "../types";

export function CreateSupportAssignmentDialogContent({
  familyProfileId = "",
}: Readonly<{ familyProfileId?: string }>) {
  const { t } = useKafilLanguage();
  const { pop } = useDialog();
  const { create } = useSupportAssignmentCommands();
  const [sponsorSearch, setSponsorSearch] = useState("");
  const [familySearch, setFamilySearch] = useState("");
  const sources = useSupportAssignmentSources({
    sponsorSearch: useDebouncedValue(sponsorSearch, 250) || undefined,
    familySearch: useDebouncedValue(familySearch, 250) || undefined,
  });
  const data = sources.data;

  async function handleSubmit(values: CreateSupportAssignmentFormValues) {
    await create.mutateAsync(toCreateSupportAssignmentInput(values));
    await pop();
  }

  const sponsorOptions =
    data?.sponsors
      .filter((sponsor) => sponsor.status === "active")
      .map((sponsor) => ({
        value: sponsor.id,
        label: `${sponsor.name} \u2014 ${sponsor.email}`,
      })) ?? [];
  const familyOptions =
    data?.families.map((family) => ({
      value: family.id,
      label: `${family.guardianLegalName} \u2014 ${family.exactAddress}`,
    })) ?? [];

  return (
    <NForm
      id="create-support-assignment-form"
      schema={createSupportAssignmentFormSchema}
      defaultValues={{
        sponsorProfileId: "",
        familyProfileId,
        notes: "",
      }}
      onSubmit={handleSubmit}
      devTools={useDevFormTools(createSupportAssignmentFormSchema, {
        sponsorProfileId: sponsorOptions,
        familyProfileId: familyOptions,
      })}
    >
      <NFormSectionHeader icon={HeartHandshake} title={t("operator.assignments.relationship")} />
      <div className="grid gap-4 md:grid-cols-2">
        <FormInput
          name="sponsorProfileId"
          type="combobox"
          formLabel={t("operator.assignments.sponsor")}
          placeholder={sources.isPending ? t("operator.assignments.loadingSponsors") : t("operator.assignments.chooseSponsor")}
          searchPlaceholder={t("operator.assignments.searchSponsors")}
          emptyMessage={t("operator.assignments.noActiveSponsor")}
          loading={sources.isFetching}
          loadingMessage={t("operator.assignments.loadingSponsors")}
          onSearchChange={setSponsorSearch}
          shouldFilter={false}
          items={sponsorOptions}
          icon="Search"
          disabled={sources.isPending}
          required
        />
        <FormInput
          name="familyProfileId"
          type="combobox"
          formLabel={t("operator.assignments.privateFamily")}
          placeholder={sources.isPending ? t("operator.assignments.loadingFamilies") : t("operator.assignments.chooseFamily")}
          searchPlaceholder={t("operator.assignments.searchFamilies")}
          emptyMessage={t("operator.assignments.noFamily")}
          loading={sources.isFetching}
          loadingMessage={t("operator.assignments.loadingFamilies")}
          onSearchChange={setFamilySearch}
          shouldFilter={false}
          items={familyOptions}
          icon="Search"
          disabled={sources.isPending || Boolean(familyProfileId)}
          required
        />
      </div>
      <FormInput name="notes" type="textarea" formLabel={t("operator.assignments.operatorNotes")} icon="NotebookPen" />
      <div className="flex justify-end pt-5">
        <NButton type="submit" disabled={create.isPending || sources.isPending}>
          {create.isPending ? t("operator.assignments.creating") : t("operator.assignments.createAssignment")}
        </NButton>
      </div>
    </NForm>
  );
}

export function EndSupportAssignmentDialogContent({
  assignment,
}: Readonly<{ assignment: SupportAssignmentView }>) {
  const { t } = useKafilLanguage();
  const { pop } = useDialog();
  const { end } = useSupportAssignmentCommands();

  async function handleSubmit(values: EndSupportAssignmentFormValues) {
    await end.mutateAsync({ id: assignment.id, reason: values.reason });
    await pop();
  }

  return (
    <NForm
      id="end-support-assignment-form"
      schema={endSupportAssignmentFormSchema}
      defaultValues={{ reason: "" }}
      onSubmit={handleSubmit}
      devTools={useDevFormTools(endSupportAssignmentFormSchema)}
      className="space-y-5"
    >
      <p className="text-sm leading-6 text-muted-foreground">
        {t("operator.assignments.endDescription")}
      </p>
      <FormInput name="reason" type="textarea" formLabel={t("operator.assignments.reason")} icon="MessageSquareText" required />
      <div className="flex justify-end pt-5">
        <NButton type="submit" variant="destructive" disabled={end.isPending}>
          {end.isPending ? t("operator.assignments.ending") : t("operator.assignments.endAssignment")}
        </NButton>
      </div>
    </NForm>
  );
}

export function EditSupportAssignmentDialogContent({
  assignment,
}: Readonly<{ assignment: SupportAssignmentView }>) {
  const { t } = useKafilLanguage();
  const { pop } = useDialog();
  const { updateNotes } = useSupportAssignmentCommands();

  async function handleSubmit(values: UpdateSupportAssignmentNotesFormValues) {
    await updateNotes.mutateAsync(
      toUpdateSupportAssignmentNotesInput(assignment.id, values),
    );
    await pop();
  }

  return (
    <NForm
      id="edit-support-assignment-form"
      schema={updateSupportAssignmentNotesFormSchema}
      defaultValues={{ notes: assignment.notes ?? "" }}
      onSubmit={handleSubmit}
      devTools={useDevFormTools(updateSupportAssignmentNotesFormSchema)}
      className="space-y-5"
    >
      <p className="text-sm leading-6 text-muted-foreground">
        {t("operator.assignments.editDescription")}
      </p>
      <FormInput
        name="notes"
        type="textarea"
        formLabel={t("operator.assignments.operatorNotes")}
        icon="NotebookPen"
      />
      <div className="flex justify-end pt-5">
        <NButton type="submit" disabled={updateNotes.isPending}>
          {updateNotes.isPending
            ? t("operator.assignments.updating")
            : t("operator.assignments.updateNotes")}
        </NButton>
      </div>
    </NForm>
  );
}
