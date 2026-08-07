"use client";

import { Contact } from "lucide-react";
import {
  AvatarFormInput,
  FormInput,
  NButton,
  NForm,
  NFormSectionHeader,
} from "najm-kit";
import { useState } from "react";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import { useDevFormTools } from "@/lib/devFormFill";
import { deleteSponsorImage, uploadSponsorImage } from "@/services/sponsorApi";

import {
  createOwnSponsorProfileFormSchema,
  toCreateOwnSponsorProfileInput,
  toUpdateOwnSponsorProfileInput,
  updateOwnSponsorProfileFormSchema,
  type CreateOwnSponsorProfileFormValues,
  type UpdateOwnSponsorProfileFormValues,
} from "../../config/sponsorProfileSchemas";
import { useOwnSponsorProfileCommands } from "../../hooks/useSponsorProfile";
import type { OwnSponsorProfile } from "../../types";
import {
  getSponsorImageError,
  SPONSOR_IMAGE_ACCEPT,
  SponsorDemographicFields,
} from "../SponsorProfileFields";

function SponsorProfileFields({ required }: Readonly<{ required?: boolean }>) {
  const { t } = useKafilLanguage();
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormInput
          name="phone"
          type="text"
          formLabel={t("operator.sponsors.phone")}
          placeholder="+212..."
          icon="Phone"
          required={required}
        />
        <FormInput
          name="cin"
          type="text"
          formLabel={t("operator.sponsors.cin")}
          placeholder={t("operator.sponsors.cinPlaceholder")}
          icon="FileKey2"
          required={required}
        />
      </div>
      <SponsorDemographicFields required={required} />
    </>
  );
}

function ProfileAvatar({
  disabled,
  error,
  imageVersion,
  onChange,
  value,
}: Readonly<{
  disabled: boolean;
  error: string | null;
  imageVersion?: string;
  onChange: (file: File | null) => void;
  value: File | string | null;
}>) {
  const { t } = useKafilLanguage();
  return (
    <div className="space-y-2">
      <AvatarFormInput
        name="image"
        formLabel={t("operator.sponsors.imageUrl")}
        subtitle={t("operator.sponsors.imageUploadGuidance")}
        accept={SPONSOR_IMAGE_ACCEPT}
        allowClear
        disabled={disabled}
        fill
        radius="xl"
        imageVersion={imageVersion}
        value={value}
        onChange={onChange}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function CreateOwnSponsorProfileForm({
  onSuccess,
}: Readonly<{ onSuccess?: () => void }>) {
  const { t } = useKafilLanguage();
  const { create } = useOwnSponsorProfileCommands();
  const [image, setImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const submitting = create.isPending || uploading;

  function handleImage(file: File | null) {
    const error = file ? getSponsorImageError(file) : null;
    setImageError(error ? t("operator.sponsors.imageUploadGuidance") : null);
    if (!error) setImage(file);
  }

  async function handleSubmit(values: CreateOwnSponsorProfileFormValues) {
    if (imageError) throw new Error(imageError);
    let uploaded: string | null = null;
    setUploading(Boolean(image));
    try {
      uploaded = image ? await uploadSponsorImage(image) : null;
      await create.mutateAsync(toCreateOwnSponsorProfileInput(values, uploaded));
      onSuccess?.();
    } catch (error) {
      if (uploaded) await deleteSponsorImage(uploaded).catch(() => undefined);
      throw error;
    } finally {
      setUploading(false);
    }
  }

  return (
    <NForm
      id="create-own-sponsor-profile-form"
      schema={createOwnSponsorProfileFormSchema}
      defaultValues={{ phone: "", cin: "", gender: "F", address: "", dateOfBirth: "" }}
      onSubmit={handleSubmit}
      devTools={useDevFormTools(createOwnSponsorProfileFormSchema)}
    >
      <NFormSectionHeader icon={Contact} title={t("sponsor.profile.completeTitle")} />
      <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
        <ProfileAvatar disabled={submitting} error={imageError} onChange={handleImage} value={image} />
        <div className="space-y-4">
          <SponsorProfileFields required />
        </div>
      </div>
      <div className="flex justify-end pt-5">
        <NButton type="submit" disabled={submitting}>
          {submitting ? t("operator.sponsors.saving") : t("sponsor.profile.completeAction")}
        </NButton>
      </div>
    </NForm>
  );
}

function dateInputValue(value: string | null) {
  return value?.slice(0, 10) ?? "";
}

export function UpdateOwnSponsorProfileForm({
  onSuccess,
  profile,
}: Readonly<{ profile: OwnSponsorProfile; onSuccess?: () => void }>) {
  const { t } = useKafilLanguage();
  const { update } = useOwnSponsorProfileCommands();
  const [image, setImage] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const submitting = update.isPending || uploading;

  function handleImage(file: File | null) {
    if (!file) {
      setImage(null);
      setRemoveImage(Boolean(profile.image));
      setImageError(null);
      return;
    }
    const error = getSponsorImageError(file);
    setImageError(error ? t("operator.sponsors.imageUploadGuidance") : null);
    if (!error) {
      setImage(file);
      setRemoveImage(false);
    }
  }

  async function handleSubmit(values: UpdateOwnSponsorProfileFormValues) {
    if (imageError) throw new Error(imageError);
    let uploaded: string | null = null;
    setUploading(Boolean(image));
    try {
      uploaded = image ? await uploadSponsorImage(image) : null;
      const nextImage = uploaded ?? (removeImage ? null : profile.image);
      await update.mutateAsync(toUpdateOwnSponsorProfileInput(values, nextImage));
      onSuccess?.();
    } catch (error) {
      if (uploaded) await deleteSponsorImage(uploaded).catch(() => undefined);
      throw error;
    } finally {
      setUploading(false);
    }
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
      devTools={useDevFormTools(updateOwnSponsorProfileFormSchema)}
    >
      <NFormSectionHeader icon={Contact} title={t("sponsor.profile.editTitle")} />
      <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
        <ProfileAvatar
          disabled={submitting}
          error={imageError}
          imageVersion={profile.updatedAt}
          onChange={handleImage}
          value={removeImage ? null : image ?? profile.image}
        />
        <div className="space-y-4">
          <SponsorProfileFields />
        </div>
      </div>
      <div className="flex justify-end pt-5">
        <NButton type="submit" disabled={submitting}>
          {submitting ? t("operator.sponsors.saving") : t("operator.sponsors.saveProfile")}
        </NButton>
      </div>
    </NForm>
  );
}
