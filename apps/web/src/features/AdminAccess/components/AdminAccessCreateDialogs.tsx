"use client";

import { KeyRound, UserRoundPlus } from "lucide-react";
import { AvatarFormInput, FormInput, NButton, NForm, NFormSectionHeader, useDialog } from "najm-kit";
import { useState } from "react";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { CreateFamilyDialogContent } from "@/features/Families/components/FamilyForms";
import { CreateSponsorDialogContent } from "@/features/Sponsors/components/SponsorForms";
import {
  deleteOperatorImage,
  uploadOperatorImage,
} from "@/services/adminAccessApi";

import {
  createAccessOperatorSchema,
  createAccessPermissionSchema,
  type CreateAccessOperatorValues,
  type CreateAccessPermissionValues,
  toCreateAccessOperatorInput,
  toCreateAccessPermissionInput,
} from "../config/adminAccessSchemas";
import { useAdminAccessCreateCommands } from "../hooks/useAdminAccess";

type AccountKind = "operator" | "family" | "sponsor";

const MAX_OPERATOR_IMAGE_SIZE = 5_000_000;
const OPERATOR_IMAGE_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function operatorImageError(file: File) {
  if (!OPERATOR_IMAGE_TYPES.has(file.type)) {
    return "Select a PNG, JPEG, WebP, AVIF, or GIF image.";
  }
  if (file.size > MAX_OPERATOR_IMAGE_SIZE) return "Image must be 5 MB or smaller.";
  return null;
}

function selectOperatorImage(
  file: File | null,
  setImage: (file: File | null) => void,
  setError: (message: string | null) => void,
) {
  if (!file) {
    setImage(null);
    setError(null);
    return;
  }

  const error = operatorImageError(file);
  if (error) {
    setError(error);
    return;
  }

  setImage(file);
  setError(null);
}

export function CreateAccessUserDialogContent() {
  const { t } = useKafilLanguage();
  const [kind, setKind] = useState<AccountKind | null>(null);

  if (kind === "family") return <CreateFamilyDialogContent />;
  if (kind === "sponsor") return <CreateSponsorDialogContent />;
  if (kind === "operator") return <CreateOperatorForm />;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {(["operator", "family", "sponsor"] as const).map((accountKind) => (
        <NButton
          key={accountKind}
          variant="outline"
          className="h-auto min-h-24 flex-col gap-2 py-4"
          onClick={() => setKind(accountKind)}
        >
          <UserRoundPlus className="h-5 w-5" />
          {t(`adminAccess.users.${accountKind}`)}
        </NButton>
      ))}
    </div>
  );
}

function CreateOperatorForm() {
  const { t } = useKafilLanguage();
  const { pop } = useDialog();
  const { createOperator } = useAdminAccessCreateCommands();
  const [operatorImage, setOperatorImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const isSubmitting = createOperator.isPending || isUploadingImage;

  async function submit(values: CreateAccessOperatorValues) {
    if (imageError) throw new Error(imageError);

    let uploadedImagePath: string | null = null;
    setIsUploadingImage(Boolean(operatorImage));

    try {
      uploadedImagePath = operatorImage
        ? await uploadOperatorImage(operatorImage)
        : null;
      await createOperator.mutateAsync(
        toCreateAccessOperatorInput(values, uploadedImagePath),
      );
      await pop();
    } catch (error) {
      if (uploadedImagePath) {
        await deleteOperatorImage(uploadedImagePath).catch(() => undefined);
      }
      throw error;
    } finally {
      setIsUploadingImage(false);
    }
  }

  return (
    <NForm
      id="create-access-operator-form"
      schema={createAccessOperatorSchema}
      defaultValues={{
        name: "",
        email: "",
        phone: "",
        cin: "",
        gender: "F",
        address: "",
        dateOfBirth: "",
        jobTitle: "",
        notes: "",
      }}
      onSubmit={submit}
    >
      <NFormSectionHeader
        icon={UserRoundPlus}
        title={t("adminAccess.users.createOperator")}
      />
      <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
        <div className="space-y-2">
          <AvatarFormInput
            name="image"
            formLabel={t("adminAccess.users.imageUrl")}
            subtitle={t("adminAccess.users.imageUploadGuidance")}
            accept="image/avif,image/gif,image/jpeg,image/png,image/webp"
            allowClear
            disabled={isSubmitting}
            fill
            radius="xl"
            value={operatorImage}
            onChange={(file) => selectOperatorImage(file, setOperatorImage, setImageError)}
          />
          {imageError ? (
            <p className="text-xs text-destructive">{imageError}</p>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput
            name="name"
            type="text"
            formLabel={t("adminAccess.users.user")}
            placeholder={t("adminAccess.users.namePlaceholder")}
            required
          />
          <FormInput
            name="email"
            type="text"
            formLabel={t("adminAccess.users.email")}
            placeholder={t("adminAccess.users.emailPlaceholder")}
            required
          />
          <FormInput
            name="phone"
            type="text"
            formLabel={t("operator.sponsors.phone")}
            placeholder={t("adminAccess.users.phonePlaceholder")}
            required
          />
          <FormInput
            name="cin"
            type="text"
            formLabel={t("operator.sponsors.cin")}
            placeholder={t("adminAccess.users.cinPlaceholder")}
            required
          />
          <FormInput
            name="gender"
            type="select"
            formLabel={t("operator.sponsors.gender")}
            placeholder={t("adminAccess.users.genderPlaceholder")}
            items={[
              { value: "F", label: t("operator.sponsors.female") },
              { value: "M", label: t("operator.sponsors.male") },
            ]}
            required
          />
          <FormInput
            name="dateOfBirth"
            type="date"
            formLabel={t("operator.sponsors.dateOfBirth")}
            placeholder={t("adminAccess.users.dateOfBirthPlaceholder")}
            required
          />
        </div>
      </div>
      <div className="space-y-4">
        <FormInput
          name="jobTitle"
          type="text"
          formLabel={t("adminAccess.users.jobTitle")}
          placeholder={t("adminAccess.users.jobTitlePlaceholder")}
        />
        <FormInput
          name="address"
          type="textarea"
          formLabel={t("operator.sponsors.address")}
          placeholder={t("adminAccess.users.addressPlaceholder")}
          required
        />
        <FormInput
          name="notes"
          type="textarea"
          formLabel={t("operator.sponsors.operatorNotes")}
          placeholder={t("adminAccess.users.notesPlaceholder")}
        />
      </div>
      <div className="flex justify-end pt-5">
        <NButton type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? t("adminAccess.users.creating")
            : t("adminAccess.users.createAndInvite")}
        </NButton>
      </div>
    </NForm>
  );
}

export function CreateAccessPermissionDialogContent() {
  const { t } = useKafilLanguage();
  const { pop } = useDialog();
  const { createPermission } = useAdminAccessCreateCommands();

  async function submit(values: CreateAccessPermissionValues) {
    await createPermission.mutateAsync(
      toCreateAccessPermissionInput(values),
    );
    await pop();
  }

  return (
    <NForm
      id="create-access-permission-form"
      schema={createAccessPermissionSchema}
      defaultValues={{
        action: "",
        resource: "",
        description: "",
        roles: ["admin"],
      }}
      onSubmit={submit}
    >
      <NFormSectionHeader
        icon={KeyRound}
        title={t("adminAccess.permissions.create")}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <FormInput
          name="resource"
          type="text"
          formLabel={t("adminAccess.permissions.resource")}
          placeholder={t("adminAccess.permissions.resourcePlaceholder")}
          required
        />
        <FormInput
          name="action"
          type="text"
          formLabel={t("adminAccess.permissions.action")}
          placeholder={t("adminAccess.permissions.actionPlaceholder")}
          required
        />
        <div className="md:col-span-2">
          <FormInput
            name="roles"
            type="multiselect"
            formLabel={t("adminAccess.permissions.liveRoles")}
            items={[
              { value: "admin", label: t("adminAccess.users.admin") },
              { value: "operator", label: t("adminAccess.users.operator") },
              { value: "family", label: t("adminAccess.users.family") },
              { value: "sponsor", label: t("adminAccess.users.sponsor") },
            ]}
          />
        </div>
        <div className="md:col-span-2">
          <FormInput
            name="description"
            type="textarea"
            formLabel={t("adminAccess.permissions.description")}
            placeholder={t("adminAccess.permissions.descriptionPlaceholder")}
          />
        </div>
      </div>
      <div className="flex justify-end pt-5">
        <NButton type="submit" disabled={createPermission.isPending}>
          {createPermission.isPending
            ? t("adminAccess.permissions.creating")
            : t("adminAccess.permissions.create")}
        </NButton>
      </div>
    </NForm>
  );
}
