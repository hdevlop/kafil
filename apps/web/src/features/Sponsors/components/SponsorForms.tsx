"use client";

import { UserRoundPlus } from "lucide-react";
import { AvatarFormInput, FormInput, NButton, NForm, NFormSectionHeader, useDialog } from "najm-kit";
import { useRef, useState } from "react";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import { useDevFormTools } from "@/lib/devFormFill";
import {
  deleteSponsorImage,
  uploadSponsorImage,
} from "@/services/sponsorApi";

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
import {
  getSponsorImageError,
  SPONSOR_IMAGE_ACCEPT,
  SponsorDemographicFields,
} from "./SponsorProfileFields";

function selectSponsorImage(
  file: File | null,
  setImage: (file: File | null) => void,
  setError: (message: string | null) => void,
) {
  if (!file) {
    setImage(null);
    setError(null);
    return;
  }

  const error = getSponsorImageError(file);
  if (error) {
    setError(error);
    return;
  }

  setImage(file);
  setError(null);
}

export function CreateSponsorDialogContent() {
  const { t } = useKafilLanguage();
  const { pop } = useDialog();
  const { create } = useSponsorCommands();
  const devTools = useDevFormTools(createSponsorFormSchema);
  const [sponsorImage, setSponsorImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const isSubmitting = create.isPending || isUploadingImage;

  async function handleSubmit(values: CreateSponsorFormValues) {
    if (imageError) throw new Error(imageError);

    let uploadedImagePath: string | null = null;
    setIsUploadingImage(Boolean(sponsorImage));

    try {
      uploadedImagePath = sponsorImage
        ? await uploadSponsorImage(sponsorImage)
        : null;
      await create.mutateAsync(
        toCreateSponsorInput(values, uploadedImagePath),
      );
      await pop();
    } catch (error) {
      if (uploadedImagePath) {
        await deleteSponsorImage(uploadedImagePath).catch(() => undefined);
      }
      throw error;
    } finally {
      setIsUploadingImage(false);
    }
  }

  return (
    <NForm
      id="create-sponsor-form"
      schema={createSponsorFormSchema}
      defaultValues={{ name: "", email: "", phone: "", cin: "", gender: "F", address: "", dateOfBirth: "", notes: "" }}
      onSubmit={handleSubmit}
      devTools={devTools}
    >
      <NFormSectionHeader icon={UserRoundPlus} title={t("operator.sponsors.account")} />
      <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
        <div className="space-y-2">
          <AvatarFormInput
            name="image"
            formLabel={t("operator.sponsors.imageUrl")}
            subtitle={t("operator.sponsors.imageUploadGuidance")}
            accept={SPONSOR_IMAGE_ACCEPT}
            allowClear
            disabled={isSubmitting}
            fill
            radius="xl"
            value={sponsorImage}
            onChange={(file) => selectSponsorImage(file, setSponsorImage, setImageError)}
          />
          {imageError ? (
            <p className="text-xs text-destructive">{imageError}</p>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput name="name" type="text" formLabel={t("operator.sponsors.fullName")} placeholder={t("operator.sponsors.fullNamePlaceholder")} icon="User" required />
          <FormInput name="email" type="text" formLabel={t("operator.sponsors.email")} placeholder="sponsor@example.com" icon="Mail" required />
          <FormInput name="phone" type="text" formLabel={t("operator.sponsors.phone")} placeholder="+212..." icon="Phone" required />
          <FormInput name="cin" type="text" formLabel={t("operator.sponsors.cin")} placeholder={t("operator.sponsors.cinPlaceholder")} icon="FileKey2" required />
        </div>
      </div>
      <SponsorDemographicFields includeNotes required />
      <div className="flex justify-end pt-5">
        <NButton type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("operator.sponsors.creating") : t("operator.sponsors.createAndInvite")}
        </NButton>
      </div>
    </NForm>
  );
}

export function UpdateSponsorDialogContent({ sponsor }: Readonly<{ sponsor: SponsorRecord }>) {
  const { t } = useKafilLanguage();
  const { pop } = useDialog();
  const { update } = useSponsorCommands();
  const [sponsorImage, setSponsorImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [removeSponsorImage, setRemoveSponsorImage] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const isSubmitting = update.isPending || isUploadingImage;

  function selectSponsorImageUpdate(file: File | null) {
    if (!file) {
      setSponsorImage(null);
      setImageError(null);
      setRemoveSponsorImage(Boolean(sponsor.image));
      return;
    }

    const error = getSponsorImageError(file);
    if (error) {
      setImageError(error);
      return;
    }

    setSponsorImage(file);
    setImageError(null);
    setRemoveSponsorImage(false);
  }

  async function handleSubmit(values: UpdateSponsorFormValues) {
    if (imageError) throw new Error(imageError);

    let uploadedImagePath: string | null = null;
    setIsUploadingImage(Boolean(sponsorImage));

    try {
      uploadedImagePath = sponsorImage
        ? await uploadSponsorImage(sponsorImage)
        : null;
      const image = uploadedImagePath ?? (removeSponsorImage ? null : sponsor.image);
      await update.mutateAsync({
        id: sponsor.id,
        input: toUpdateSponsorInput(values, image),
      });
      if (
        sponsor.image &&
        sponsor.image !== image &&
        sponsor.image.startsWith("/api/sponsor-images/files/serve/")
      ) {
        await deleteSponsorImage(sponsor.image).catch(() => undefined);
      }
      await pop();
    } catch (error) {
      if (uploadedImagePath) {
        await deleteSponsorImage(uploadedImagePath).catch(() => undefined);
      }
      throw error;
    } finally {
      setIsUploadingImage(false);
    }
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
      devTools={useDevFormTools(updateSponsorFormSchema)}
    >
      <NFormSectionHeader icon={UserRoundPlus} title={t("operator.sponsors.account")} />
      <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
        <div className="space-y-2">
          <AvatarFormInput
            name="image"
            formLabel={t("operator.sponsors.imageUrl")}
            subtitle={t("operator.sponsors.imageUploadGuidance")}
            accept={SPONSOR_IMAGE_ACCEPT}
            allowClear
            disabled={isSubmitting}
            fill
            radius="xl"
            imageVersion={sponsor.updatedAt}
            value={removeSponsorImage ? null : sponsorImage ?? sponsor.image}
            onChange={selectSponsorImageUpdate}
          />
          {imageError ? (
            <p className="text-xs text-destructive">{imageError}</p>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput name="name" type="text" formLabel={t("operator.sponsors.fullName")} placeholder={t("operator.sponsors.fullNamePlaceholder")} icon="User" required />
          <FormInput name="email" type="text" formLabel={t("operator.sponsors.email")} placeholder="sponsor@example.com" icon="Mail" required />
          <FormInput name="phone" type="text" formLabel={t("operator.sponsors.phone")} placeholder="+212..." icon="Phone" />
          <FormInput name="cin" type="text" formLabel={t("operator.sponsors.cin")} placeholder={t("operator.sponsors.cinPlaceholder")} icon="FileKey2" />
        </div>
      </div>
      <SponsorDemographicFields includeNotes />
      <div className="flex justify-end pt-5">
        <NButton type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("operator.sponsors.saving") : t("operator.sponsors.saveProfile")}
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
      devTools={useDevFormTools(sponsorStatusFormSchema)}
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

export function BulkDeleteSponsorsDialogContent({
  sponsorIds,
  onDeleted,
}: Readonly<{ sponsorIds: string[]; onDeleted: () => void }>) {
  const { t } = useKafilLanguage();
  const { pop } = useDialog();
  const { bulkRemove } = useSponsorCommands();
  const submittingRef = useRef(false);

  async function handleDelete() {
    if (submittingRef.current) return;
    submittingRef.current = true;

    try {
      await bulkRemove.mutateAsync(sponsorIds);
      onDeleted();
      await pop();
    } catch {
      submittingRef.current = false;
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-muted-foreground">
        {t("operator.sponsors.bulkDeleteWarning", {
          count: sponsorIds.length,
        })}
      </p>
      <div className="flex justify-end pt-5">
        <NButton
          type="button"
          variant="destructive"
          disabled={bulkRemove.isPending}
          onClick={() => void handleDelete()}
        >
          {bulkRemove.isPending
            ? t("operator.sponsors.bulkDeleting")
            : t("operator.sponsors.bulkDeleteAccount")}
        </NButton>
      </div>
    </div>
  );
}
