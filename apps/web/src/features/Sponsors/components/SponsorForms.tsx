"use client";

import { UserRoundPlus } from "lucide-react";
import { FormInput, NButton, NForm, NFormSectionHeader, useDialog } from "najm-kit";
import { useState } from "react";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { devFormTools } from "@/lib/devFormFill";

import {
  createSponsorFormSchema,
  sponsorStatusFormSchema,
  toCreateSponsorInput,
  toUpdateSponsorInput,
  updateSponsorFormSchema,
  type CreateSponsorFormValues,
  type SponsorStatusFormValues,
  type UpdateSponsorFormValues,
} from "../config/sponsorSchemas";
import { useSponsorCommands } from "../hooks/useSponsors";
import type { SponsorRecord } from "../types";
import { InitialCredentialsCard } from "@/shared/InitialCredentialsCard";

function SponsorProfileFields({ required = false }: Readonly<{ required?: boolean }>) {
  const { t } = useKafilLanguage();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FormInput name="phone" type="text" formLabel={t("operator.sponsors.phone")} placeholder="+212..." icon="Phone" required={required} />
      <FormInput name="cin" type="text" formLabel={t("operator.sponsors.cin")} placeholder={t("operator.sponsors.cinPlaceholder")} icon="FileKey2" required={required} />
      <FormInput
        name="gender"
        type="select"
        formLabel={t("operator.sponsors.gender")}
        items={[
          { value: "F", label: t("operator.sponsors.female") },
          { value: "M", label: t("operator.sponsors.male") },
        ]}
        icon="Users"
        required={required}
      />
      <FormInput name="dateOfBirth" type="date" formLabel={t("operator.sponsors.dateOfBirth")} placeholder={t("operator.sponsors.datePlaceholder")} icon="Calendar" required={required} />
      <div className="md:col-span-2">
        <FormInput name="address" type="textarea" formLabel={t("operator.sponsors.address")} placeholder={t("operator.sponsors.addressPlaceholder")} icon="MapPin" required={required} />
      </div>
      <div className="md:col-span-2">
        <FormInput name="notes" type="textarea" formLabel={t("operator.sponsors.operatorNotes")} placeholder={t("operator.sponsors.notesPlaceholder")} icon="NotebookPen" />
      </div>
    </div>
  );
}

function SponsorAccountFields({
  profileRequired = false,
}: Readonly<{ profileRequired?: boolean }>) {
  const { t } = useKafilLanguage();

  return (
    <>
      <NFormSectionHeader icon={UserRoundPlus} title={t("operator.sponsors.account")} />
      <div className="grid gap-4 md:grid-cols-2">
        <FormInput name="name" type="text" formLabel={t("operator.sponsors.fullName")} placeholder={t("operator.sponsors.fullNamePlaceholder")} icon="User" required />
        <FormInput name="email" type="text" formLabel={t("operator.sponsors.email")} placeholder="sponsor@example.com" icon="Mail" required />
      </div>
      <SponsorProfileFields required={profileRequired} />
    </>
  );
}

export function CreateSponsorDialogContent() {
  const { t } = useKafilLanguage();
  const { pop } = useDialog();
  const { create } = useSponsorCommands();
  const [credentials, setCredentials] = useState<{
    password: string;
    phone: string;
  } | null>(null);

  async function handleSubmit(values: CreateSponsorFormValues) {
    const created = await create.mutateAsync(toCreateSponsorInput(values));
    setCredentials({ password: created.initialPassword, phone: values.phone });
  }

  if (credentials) {
    return (
      <InitialCredentialsCard
        password={credentials.password}
        phone={credentials.phone}
        onDone={() => void pop()}
      />
    );
  }

  return (
    <NForm
      id="create-sponsor-form"
      schema={createSponsorFormSchema}
      defaultValues={{ name: "", email: "", phone: "", cin: "", gender: "F", address: "", dateOfBirth: "", notes: "" }}
      onSubmit={handleSubmit}
      devTools={devFormTools(createSponsorFormSchema)}
    >
      <SponsorAccountFields profileRequired />
      <div className="flex justify-end pt-5">
        <NButton type="submit" disabled={create.isPending}>
          {create.isPending ? t("operator.sponsors.creating") : t("operator.sponsors.createAndInvite")}
        </NButton>
      </div>
    </NForm>
  );
}

export function UpdateSponsorDialogContent({ sponsor }: Readonly<{ sponsor: SponsorRecord }>) {
  const { t } = useKafilLanguage();
  const { pop } = useDialog();
  const { update } = useSponsorCommands();

  async function handleSubmit(values: UpdateSponsorFormValues) {
    await update.mutateAsync({ id: sponsor.id, input: toUpdateSponsorInput(values) });
    await pop();
  }

  return (
    <NForm
      id="update-sponsor-form"
      schema={updateSponsorFormSchema}
      defaultValues={{
        name: sponsor.name,
        email: sponsor.email,
        phone: sponsor.phone ?? "",
        cin: sponsor.cin ?? "",
        gender: sponsor.gender ?? undefined,
        address: sponsor.address ?? "",
        dateOfBirth: sponsor.dateOfBirth ?? "",
        notes: sponsor.notes ?? "",
      }}
      onSubmit={handleSubmit}
      devTools={devFormTools(updateSponsorFormSchema)}
    >
      <SponsorAccountFields />
      <div className="flex justify-end pt-5">
        <NButton type="submit" disabled={update.isPending}>
          {update.isPending ? t("operator.sponsors.saving") : t("operator.sponsors.saveProfile")}
        </NButton>
      </div>
    </NForm>
  );
}

export function SponsorStatusDialogContent({
  action,
  sponsor,
}: Readonly<{
  action: "deactivate" | "reactivate";
  sponsor: SponsorRecord;
}>) {
  const { t } = useKafilLanguage();
  const { pop } = useDialog();
  const commands = useSponsorCommands();
  const command = commands[action];

  async function handleSubmit(values: SponsorStatusFormValues) {
    await command.mutateAsync({ id: sponsor.id, reason: values.reason });
    await pop();
  }

  return (
    <NForm
      id="sponsor-status-form"
      schema={sponsorStatusFormSchema}
      defaultValues={{ reason: "" }}
      onSubmit={handleSubmit}
      devTools={devFormTools(sponsorStatusFormSchema)}
      className="space-y-5"
    >
      <p className="text-sm leading-6 text-muted-foreground">
        {t("operator.sponsors.historyDescription")}
      </p>
      <FormInput name="reason" type="textarea" formLabel={t("operator.sponsors.reason")} placeholder={t(action === "deactivate" ? "operator.sponsors.deactivateReason" : "operator.sponsors.reactivateReason")} icon="MessageSquareText" required />
      <div className="flex justify-end pt-5">
        <NButton type="submit" variant={action === "deactivate" ? "destructive" : "default"} disabled={command.isPending}>
          {command.isPending ? t("operator.sponsors.saving") : action === "deactivate" ? t("operator.sponsors.deactivateSponsor") : t("operator.sponsors.reactivateSponsor")}
        </NButton>
      </div>
    </NForm>
  );
}

export function DeleteSponsorDialogContent({
  sponsor,
}: Readonly<{ sponsor: SponsorRecord }>) {
  const { t } = useKafilLanguage();
  const { pop } = useDialog();
  const { remove } = useSponsorCommands();

  async function handleDelete() {
    await remove.mutateAsync(sponsor.id);
    await pop();
  }

  return (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-muted-foreground">
        {t("operator.sponsors.deleteWarning")}
      </p>
      <div className="flex justify-end pt-5">
        <NButton
          type="button"
          variant="destructive"
          disabled={remove.isPending}
          onClick={() => void handleDelete()}
        >
          {remove.isPending ? t("operator.sponsors.deleting") : t("operator.sponsors.deleteAccount")}
        </NButton>
      </div>
    </div>
  );
}
