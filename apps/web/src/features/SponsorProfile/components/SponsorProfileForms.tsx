"use client";

import { Contact } from "lucide-react";
import { FormInput, NButton, NForm, NFormSectionHeader } from "najm-kit";

import { devFormTools } from "@/lib/devFormFill";

import {
  createOwnSponsorProfileFormSchema,
  toCreateOwnSponsorProfileInput,
  toUpdateOwnSponsorProfileInput,
  updateOwnSponsorProfileFormSchema,
  type CreateOwnSponsorProfileFormValues,
  type UpdateOwnSponsorProfileFormValues,
} from "../config/sponsorProfileSchemas";
import { useOwnSponsorProfileCommands } from "../hooks/useSponsorProfile";
import type { OwnSponsorProfile } from "../types";

function SponsorProfileFields({ required }: Readonly<{ required?: boolean }>) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FormInput name="phone" type="text" formLabel="Phone" placeholder="+212..." icon="Phone" required={required} />
      <FormInput name="cin" type="text" formLabel="CIN" placeholder="National identity number" icon="FileKey2" required={required} />
      <FormInput
        name="gender"
        type="select"
        formLabel="Gender"
        items={[
          { value: "F", label: "Female" },
          { value: "M", label: "Male" },
        ]}
        icon="Users"
        required={required}
      />
      <FormInput name="dateOfBirth" type="date" formLabel="Date of birth" icon="Calendar" required={required} />
      <div className="md:col-span-2">
        <FormInput name="address" type="textarea" formLabel="Address" placeholder="Your private address" icon="MapPin" required={required} />
      </div>
    </div>
  );
}

export function CreateOwnSponsorProfileForm() {
  const { create } = useOwnSponsorProfileCommands();

  async function handleSubmit(values: CreateOwnSponsorProfileFormValues) {
    await create.mutateAsync(toCreateOwnSponsorProfileInput(values));
  }

  return (
    <NForm
      id="create-own-sponsor-profile-form"
      schema={createOwnSponsorProfileFormSchema}
      defaultValues={{ phone: "", cin: "", gender: "F", address: "", dateOfBirth: "" }}
      onSubmit={handleSubmit}
      devTools={devFormTools(createOwnSponsorProfileFormSchema)}
    >
      <NFormSectionHeader icon={Contact} title="Complete your sponsor profile" />
      <SponsorProfileFields required />
      <div className="flex justify-end pt-5">
        <NButton type="submit" disabled={create.isPending}>
          {create.isPending ? "Saving profile..." : "Complete profile"}
        </NButton>
      </div>
    </NForm>
  );
}

function dateInputValue(value: string | null) {
  return value?.slice(0, 10) ?? "";
}

export function UpdateOwnSponsorProfileForm({
  profile,
}: Readonly<{ profile: OwnSponsorProfile }>) {
  const { update } = useOwnSponsorProfileCommands();

  async function handleSubmit(values: UpdateOwnSponsorProfileFormValues) {
    await update.mutateAsync(toUpdateOwnSponsorProfileInput(values));
  }

  return (
    <NForm
      id="update-own-sponsor-profile-form"
      schema={updateOwnSponsorProfileFormSchema}
      defaultValues={{
        phone: profile.phone ?? "",
        cin: profile.cin ?? "",
        gender: profile.gender ?? undefined,
        address: profile.address ?? "",
        dateOfBirth: dateInputValue(profile.dateOfBirth),
      }}
      onSubmit={handleSubmit}
      devTools={devFormTools(updateOwnSponsorProfileFormSchema)}
    >
      <NFormSectionHeader icon={Contact} title="Your sponsor profile" />
      <SponsorProfileFields />
      <div className="flex justify-end pt-5">
        <NButton type="submit" disabled={update.isPending}>
          {update.isPending ? "Saving profile..." : "Save profile"}
        </NButton>
      </div>
    </NForm>
  );
}
