"use client";

import {
  AvatarFormInput,
  FormInput,
  NButton,
  NCredentialsCard,
  NForm,
  useDialog,
  useNForm,
} from "najm-kit";
import { KeyRound, Phone } from "lucide-react";
import { useState } from "react";

import { useTranslation } from "najm-i18n/react";
import {
  deleteStaffImage,
  STAFF_IMAGE_SERVE_ROUTE,
  uploadStaffImage,
} from "@/services/staffApi";

import {
  createStaffFormSchema,
  provisionStaffAccessSchema,
  staffStatusFormSchema,
  toCreateStaffInput,
  toUpdateStaffInput,
  updateStaffFormSchema,
  type CreateStaffFormValues,
  type ProvisionStaffAccessValues,
  type StaffStatusFormValues,
  type UpdateStaffFormValues,
} from "../config/staffSchemas";
import { useStaffCommands } from "../hooks/useStaff";
import type { StaffRecord } from "../types";

const MAX_STAFF_IMAGE_SIZE = 5_000_000;
const STAFF_IMAGE_TYPES = new Set([
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function staffImageError(file: File) {
  if (!STAFF_IMAGE_TYPES.has(file.type)) {
    return "Select a PNG, JPEG, WebP, or AVIF image.";
  }
  if (file.size > MAX_STAFF_IMAGE_SIZE) {
    return "Image must be 5 MB or smaller.";
  }
  return null;
}

function selectStaffImage(
  file: File | null,
  setImage: (file: File | null) => void,
  setError: (message: string | null) => void,
) {
  if (!file) {
    setImage(null);
    setError(null);
    return;
  }

  const error = staffImageError(file);
  if (error) {
    setError(error);
    return;
  }

  setImage(file);
  setError(null);
}

export function CreateStaffDialogContent() {
  const { t } = useTranslation();
  const { pop } = useDialog();
  const { create } = useStaffCommands();
  const [staffImage, setStaffImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const isSubmitting = create.isPending || isUploadingImage;
  const form = useNForm({
    schema: createStaffFormSchema,
    defaultValues: {
      address: "",
      affiliation: "internal",
      cin: "",
      companyName: "",
      contactEmail: "",
      dateOfBirth: "",
      gender: "F",
      image: "",
      jobTitle: "",
      name: "",
      notes: "",
      phone: "",
      functions: ["operator"],
    },
  });

  async function handleSubmit(values: CreateStaffFormValues) {
    if (imageError) throw new Error(imageError);

    let uploadedImagePath: string | null = null;
    setIsUploadingImage(Boolean(staffImage));

    try {
      uploadedImagePath = staffImage
        ? await uploadStaffImage(staffImage)
        : null;
      const input = toCreateStaffInput({
        ...values,
        image: uploadedImagePath,
      });
      await create.mutateAsync(input);
      await pop();
    } catch (error) {
      if (uploadedImagePath) {
        await deleteStaffImage(uploadedImagePath).catch(() => undefined);
      }
      throw error;
    } finally {
      setIsUploadingImage(false);
    }
  }

  return (
    <NForm
      form={form}
      id="create-staff-form"
      schema={createStaffFormSchema}
      onSubmit={handleSubmit}
    >
      <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
        <div className="space-y-2">
          <AvatarFormInput
            accept="image/avif,image/jpeg,image/png,image/webp"
            allowClear
            disabled={isSubmitting}
            fill
            formLabel={t("operator.staff.imageUrl")}
            name="image"
            radius="xl"
            subtitle={t("operator.staff.imageUploadGuidance")}
            value={staffImage}
            onChange={(file) =>
              selectStaffImage(file, setStaffImage, setImageError)
            }
          />
          {imageError ? (
            <p className="text-xs text-destructive">{imageError}</p>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput
            formLabel={t("operator.staff.fullName")}
            name="name"
            placeholder={t("operator.staff.fullNamePlaceholder")}
            required
            type="text"
          />
          <FormInput
            formLabel={t("operator.staff.gender")}
            items={[
              { value: "F", label: t("operator.staff.female") },
              { value: "M", label: t("operator.staff.male") },
            ]}
            name="gender"
            required
            type="select"
          />
          <FormInput
            formLabel={t("operator.staff.dateOfBirth")}
            name="dateOfBirth"
            placeholder={t("operator.staff.dateOfBirthPlaceholder")}
            required
            type="date"
          />
          <FormInput
            formLabel={t("operator.staff.cin")}
            name="cin"
            placeholder={t("operator.staff.cinPlaceholder")}
            required
            type="text"
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FormInput
          formLabel={t("operator.staff.phone")}
          name="phone"
          placeholder={t("operator.staff.phonePlaceholder")}
          required
          type="text"
        />
        <FormInput
          formLabel={t("operator.staff.email")}
          name="contactEmail"
          placeholder={t("operator.staff.emailPlaceholder")}
          required
          type="text"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FormInput
          formLabel={t("operator.staff.role")}
          items={[
            { value: "operator", label: t("operator.staff.functionOperator") },
            { value: "delivery", label: t("operator.staff.functionDelivery") },
          ]}
          name="functions"
          required
          showSearch={false}
          type="multiselect"
        />
        <FormInput
          formLabel={t("operator.staff.jobTitle")}
          name="jobTitle"
          placeholder={t("operator.staff.jobTitlePlaceholder")}
          type="text"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FormInput
          formLabel={t("operator.staff.address")}
          name="address"
          placeholder={t("operator.staff.addressPlaceholder")}
          required
          type="textarea"
        />
        <FormInput
          formLabel={t("operator.staff.notes")}
          name="notes"
          placeholder={t("operator.staff.notesPlaceholder")}
          type="textarea"
        />
      </div>

      <div className="flex justify-end pt-5">
        <NButton type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? t("operator.staff.creatingStaff")
            : t("operator.staff.createAndInvite")}
        </NButton>
      </div>
    </NForm>
  );
}

export function UpdateStaffDialogContent({
  staff,
}: Readonly<{ staff: StaffRecord }>) {
  const { t } = useTranslation();
  const { pop } = useDialog();
  const { update } = useStaffCommands();
  const [staffImage, setStaffImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [removeStaffImage, setRemoveStaffImage] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const isSubmitting = update.isPending || isUploadingImage;
  const form = useNForm({
    schema: updateStaffFormSchema,
    defaultValues: {
      address: staff.address ?? "",
      affiliation: "internal",
      cin: staff.cin ?? "",
      companyName: "",
      contactEmail: staff.contactEmail ?? "",
      dateOfBirth: staff.dateOfBirth ?? "",
      gender: staff.gender ?? undefined,
      image: staff.image ?? "",
      jobTitle: staff.jobTitle ?? "",
      name: staff.name,
      notes: staff.notes ?? "",
      phone: staff.phone,
      functions: staff.functions,
    },
  });

  function selectStaffImageUpdate(file: File | null) {
    if (!file) {
      setStaffImage(null);
      setImageError(null);
      setRemoveStaffImage(Boolean(staff.image));
      return;
    }

    const error = staffImageError(file);
    if (error) {
      setImageError(error);
      return;
    }

    setStaffImage(file);
    setImageError(null);
    setRemoveStaffImage(false);
  }

  async function handleSubmit(values: UpdateStaffFormValues) {
    if (imageError) throw new Error(imageError);

    let uploadedImagePath: string | null = null;
    setIsUploadingImage(Boolean(staffImage));

    try {
      uploadedImagePath = staffImage
        ? await uploadStaffImage(staffImage)
        : null;
      const image = uploadedImagePath ?? (removeStaffImage ? null : staff.image);
      await update.mutateAsync({
        id: staff.id,
        input: toUpdateStaffInput({ ...values, image }),
      });
      if (
        staff.image &&
        staff.image !== image &&
        staff.image.startsWith(STAFF_IMAGE_SERVE_ROUTE)
      ) {
        await deleteStaffImage(staff.image).catch(() => undefined);
      }
      await pop();
    } catch (error) {
      if (uploadedImagePath) {
        await deleteStaffImage(uploadedImagePath).catch(() => undefined);
      }
      throw error;
    } finally {
      setIsUploadingImage(false);
    }
  }

  return (
    <NForm
      form={form}
      id={`update-staff-form-${staff.id}`}
      schema={updateStaffFormSchema}
      onSubmit={handleSubmit}
    >
      <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
        <div className="space-y-2">
          <AvatarFormInput
            accept="image/avif,image/jpeg,image/png,image/webp"
            allowClear
            disabled={isSubmitting}
            fill
            formLabel={t("operator.staff.imageUrl")}
            imageVersion={staff.updatedAt}
            name="image"
            radius="xl"
            subtitle={t("operator.staff.imageUploadGuidance")}
            value={removeStaffImage ? null : staffImage ?? staff.image}
            onChange={selectStaffImageUpdate}
          />
          {imageError ? (
            <p className="text-xs text-destructive">{imageError}</p>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput
            formLabel={t("operator.staff.fullName")}
            name="name"
            placeholder={t("operator.staff.fullNamePlaceholder")}
            required
            type="text"
          />
          <FormInput
            formLabel={t("operator.staff.gender")}
            items={[
              { value: "F", label: t("operator.staff.female") },
              { value: "M", label: t("operator.staff.male") },
            ]}
            name="gender"
            required
            type="select"
          />
          <FormInput
            formLabel={t("operator.staff.dateOfBirth")}
            name="dateOfBirth"
            placeholder={t("operator.staff.dateOfBirthPlaceholder")}
            required
            type="date"
          />
          <FormInput
            formLabel={t("operator.staff.cin")}
            name="cin"
            placeholder={t("operator.staff.cinPlaceholder")}
            required
            type="text"
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FormInput
          formLabel={t("operator.staff.phone")}
          name="phone"
          placeholder={t("operator.staff.phonePlaceholder")}
          required
          type="text"
        />
        <FormInput
          formLabel={t("operator.staff.email")}
          name="contactEmail"
          placeholder={t("operator.staff.emailPlaceholder")}
          required
          type="text"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FormInput
          formLabel={t("operator.staff.role")}
          items={[
            { value: "operator", label: t("operator.staff.functionOperator") },
            { value: "delivery", label: t("operator.staff.functionDelivery") },
          ]}
          name="functions"
          required
          showSearch={false}
          type="multiselect"
        />
        <FormInput
          formLabel={t("operator.staff.jobTitle")}
          name="jobTitle"
          placeholder={t("operator.staff.jobTitlePlaceholder")}
          type="text"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FormInput
          formLabel={t("operator.staff.address")}
          name="address"
          placeholder={t("operator.staff.addressPlaceholder")}
          required
          type="textarea"
        />
        <FormInput
          formLabel={t("operator.staff.notes")}
          name="notes"
          placeholder={t("operator.staff.notesPlaceholder")}
          type="textarea"
        />
      </div>

      <div className="flex justify-end pt-5">
        <NButton type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("operator.staff.saving") : t("operator.staff.saveProfile")}
        </NButton>
      </div>
    </NForm>
  );
}

export function StaffStatusDialogContent({
  action,
  staff,
}: Readonly<{
  action: "deactivate" | "reactivate";
  staff: StaffRecord;
}>) {
  const { t } = useTranslation();
  const { pop } = useDialog();
  const commands = useStaffCommands();
  const command = commands[action];

  async function handleSubmit(values: StaffStatusFormValues) {
    await command.mutateAsync({ id: staff.id, reason: values.reason });
    await pop();
  }

  return (
    <NForm
      className="space-y-5"
      defaultValues={{ reason: "" }}
      id={`staff-status-form-${staff.id}`}
      schema={staffStatusFormSchema}
      onSubmit={handleSubmit}
    >
      <p className="text-sm leading-6 text-muted-foreground">
        {t("operator.staff.lifecycleDescription")}
      </p>
      <FormInput
        formLabel={t("operator.staff.reason")}
        name="reason"
        placeholder={t(
          action === "deactivate"
            ? "operator.staff.deactivateReasonPlaceholder"
            : "operator.staff.reactivateReasonPlaceholder",
        )}
        required
        type="textarea"
      />
      <div className="flex justify-end pt-5">
        <NButton
          type="submit"
          variant={action === "deactivate" ? "destructive" : "default"}
          disabled={command.isPending}
        >
          {command.isPending
            ? t("operator.staff.saving")
            : action === "deactivate"
              ? t("operator.staff.deactivateStaff")
              : t("operator.staff.reactivateStaff")}
        </NButton>
      </div>
    </NForm>
  );
}

export function DeleteStaffDialogContent({
  staff,
}: Readonly<{ staff: StaffRecord }>) {
  const { t } = useTranslation();
  const { pop } = useDialog();
  const { remove } = useStaffCommands();

  async function handleDelete() {
    await remove.mutateAsync(staff.id);
    await pop();
  }

  return (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-muted-foreground">
        {t("operator.staff.deleteWarning")}
      </p>
      <div className="flex justify-end pt-5">
        <NButton
          type="button"
          variant="destructive"
          disabled={remove.isPending}
          onClick={() => void handleDelete()}
        >
          {remove.isPending
            ? t("operator.staff.deleting")
            : t("operator.staff.deleteStaff")}
        </NButton>
      </div>
    </div>
  );
}

export function BulkDeleteStaffDialogContent({
  staffIds,
  onDeleted,
}: Readonly<{ staffIds: string[]; onDeleted: () => void }>) {
  const { t } = useTranslation();
  const { pop } = useDialog();
  const { bulkRemove } = useStaffCommands();

  async function handleDelete() {
    await bulkRemove.mutateAsync(staffIds);
    onDeleted();
    await pop();
  }

  return (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-muted-foreground">
        {t("operator.staff.bulkDeleteWarning", { count: staffIds.length })}
      </p>
      <div className="flex justify-end pt-5">
        <NButton
          type="button"
          variant="destructive"
          disabled={bulkRemove.isPending}
          onClick={() => void handleDelete()}
        >
          {bulkRemove.isPending
            ? t("operator.staff.bulkDeleting")
            : t("operator.staff.bulkDeleteStaff")}
        </NButton>
      </div>
    </div>
  );
}

export function ProvisionStaffAccessDialogContent({
  staff,
}: Readonly<{ staff: StaffRecord }>) {
  const { t } = useTranslation();
  const { pop } = useDialog();
  const { provisionAccess } = useStaffCommands();
  const [credentials, setCredentials] = useState<{
    password: string;
    phone: string;
  } | null>(null);

  async function handleSubmit(values: ProvisionStaffAccessValues) {
    const result = await provisionAccess.mutateAsync({
      id: staff.id,
      email: values.email,
    });
    setCredentials({ phone: staff.phone, password: result.initialPassword });
  }

  if (credentials) {
    return (
      <NCredentialsCard
        title={t("operator.staff.accessCreated")}
        description={t("operator.staff.accessOneTimeHint")}
        fields={[
          { label: t("common.phone"), value: credentials.phone, icon: Phone },
          {
            label: t("operator.staff.accessInitialPassword"),
            value: credentials.password,
            icon: KeyRound,
          },
        ]}
        copyLabel={t("common.copyDetails")}
        copiedLabel={t("common.copied")}
        copyErrorLabel={t("common.copyError")}
        actions={<NButton onClick={() => void pop()}>{t("common.done")}</NButton>}
      />
    );
  }

  return (
    <NForm
      defaultValues={{ email: staff.email ?? "" }}
      id={`staff-provision-access-${staff.id}`}
      schema={provisionStaffAccessSchema}
      onSubmit={handleSubmit}
    >
      <p className="text-sm leading-6 text-muted-foreground">
        {t("operator.staff.provisionAccessDescription")}
      </p>
      <FormInput
        formLabel={t("operator.staff.provisionAccessEmailLabel")}
        name="email"
        placeholder={t("operator.staff.provisionAccessEmailPlaceholder")}
        required
        type="text"
      />
      <div className="flex justify-end pt-5">
        <NButton type="submit" disabled={provisionAccess.isPending}>
          {provisionAccess.isPending
            ? t("operator.staff.provisioningAccess")
            : t("operator.staff.provisionAccess")}
        </NButton>
      </div>
    </NForm>
  );
}
