"use client";

import { Baby } from "lucide-react";
import {
  AvatarFormInput,
  FormInput,
  NButton,
  NForm,
  NFormSectionHeader,
  useDialog,
} from "najm-kit";
import { useRef, useState } from "react";

import { useDevFormTools } from "@/lib/devFormFill";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { deleteChildImage, uploadChildImage } from "@/services/childApi";

import {
  childStatusFormSchema,
  createChildFormSchema,
  toCreateChildInput,
  toUpdateChildInput,
  updateChildFormSchema,
  type ChildStatusFormValues,
  type CreateChildFormValues,
  type UpdateChildFormValues,
} from "../config/childSchemas";
import { useChildCommands, useChildFamilies } from "../hooks/useChildren";
import type { ChildRecord } from "../types";

const MAX_CHILD_IMAGE_SIZE = 5_000_000;
const CHILD_IMAGE_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function childImageError(file: File) {
  if (!CHILD_IMAGE_TYPES.has(file.type)) {
    return "Select a PNG, JPEG, WebP, AVIF, or GIF image.";
  }
  if (file.size > MAX_CHILD_IMAGE_SIZE) return "Image must be 5 MB or smaller.";
  return null;
}

function selectChildImage(
  file: File | null,
  setImage: (file: File | null) => void,
  setError: (message: string | null) => void,
) {
  if (!file) {
    setImage(null);
    setError(null);
    return;
  }

  const error = childImageError(file);
  if (error) {
    setError(error);
    return;
  }

  setImage(file);
  setError(null);
}

function ChildAvatarBlock({
  disabled,
  image,
  imageError,
  imageVersion,
  onImageChange,
}: Readonly<{
  disabled: boolean;
  image: File | string | null;
  imageError: string | null;
  imageVersion?: string | null;
  onImageChange: (file: File | null) => void;
}>) {
  const { t } = useKafilLanguage();
  return (
    <div className="space-y-2">
      <AvatarFormInput
        name="image"
        formLabel={t("operator.children.imageUrl")}
        subtitle={t("operator.children.imageUploadGuidance")}
        accept="image/avif,image/gif,image/jpeg,image/png,image/webp"
        allowClear
        disabled={disabled}
        fill
        radius="xl"
        imageVersion={imageVersion}
        value={image}
        onChange={onImageChange}
      />
      {imageError ? (
        <p className="text-xs text-destructive">{imageError}</p>
      ) : null}
    </div>
  );
}

export function CreateChildDialogContent() {
  const { t } = useKafilLanguage();
  const { pop } = useDialog();
  const { create } = useChildCommands();
  const families = useChildFamilies();
  const [childImage, setChildImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const isSubmitting = create.isPending || isUploadingImage;
  const familyOptions =
    families.data?.map((family) => ({
      value: family.id,
      label: `${family.name} \u2014 ${family.exactAddress}`,
    })) ?? [];

  async function handleSubmit(values: CreateChildFormValues) {
    if (imageError) throw new Error(imageError);

    let uploadedImagePath: string | null = null;
    setIsUploadingImage(Boolean(childImage));

    try {
      uploadedImagePath = childImage
        ? await uploadChildImage(childImage)
        : null;
      await create.mutateAsync(toCreateChildInput(values, uploadedImagePath));
      await pop();
    } catch (error) {
      if (uploadedImagePath) {
        await deleteChildImage(uploadedImagePath).catch(() => undefined);
      }
      throw error;
    } finally {
      setIsUploadingImage(false);
    }
  }

  return (
    <NForm
      id="create-child-form"
      schema={createChildFormSchema}
      defaultValues={{
        familyProfileId: "",
        legalName: "",
        dateOfBirth: "",
        gender: "F",
        schoolLevel: "",
        clothingSize: "",
        shoeSize: "",
        notes: "",
      }}
      onSubmit={handleSubmit}
      devTools={useDevFormTools(createChildFormSchema, {
        familyProfileId: familyOptions,
      })}
    >
      <NFormSectionHeader icon={Baby} title={t("operator.children.record")} />
      <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
        <ChildAvatarBlock
          disabled={isSubmitting}
          image={childImage}
          imageError={imageError}
          onImageChange={(file) => selectChildImage(file, setChildImage, setImageError)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormInput
              name="familyProfileId"
              type="combobox"
              formLabel={t("operator.families.profile")}
              placeholder={
                families.isPending ? t("operator.families.loading") : t("operator.children.chooseFamily")
              }
              searchPlaceholder={t("operator.children.searchFamilies")}
              emptyMessage={t("operator.children.noFamily")}
              items={familyOptions}
              icon="Search"
              disabled={families.isPending}
              required
            />
          </div>
          <FormInput name="legalName" type="text" formLabel={t("operator.families.legalName")} placeholder={t("operator.families.childLegalName")} icon="User" required />
          <FormInput name="dateOfBirth" type="date" formLabel={t("operator.families.dateOfBirth")} icon="Calendar" required />
          <FormInput
            name="gender"
            type="select"
            formLabel={t("operator.families.gender")}
            items={[
              { value: "F", label: t("operator.families.female") },
              { value: "M", label: t("operator.families.male") },
            ]}
            icon="Users"
            required
          />
          <FormInput name="schoolLevel" type="text" formLabel={t("operator.families.schoolLevel")} placeholder={t("operator.families.optional")} icon="GraduationCap" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormInput name="clothingSize" type="text" formLabel={t("operator.families.clothingSize")} placeholder={t("operator.families.optional")} icon="Shirt" />
        <FormInput name="shoeSize" type="text" formLabel={t("operator.families.shoeSize")} placeholder={t("operator.families.optional")} icon="Footprints" />
      </div>
      <FormInput name="notes" type="textarea" formLabel={t("operator.children.operatorNotes")} placeholder={t("operator.children.optionalNotes")} icon="NotebookPen" />

      <div className="flex justify-end pt-5">
        <NButton type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("operator.children.creating") : t("operator.children.create")}
        </NButton>
      </div>
    </NForm>
  );
}

export function UpdateChildDialogContent({
  child,
}: Readonly<{ child: ChildRecord }>) {
  const { t } = useKafilLanguage();
  const { pop } = useDialog();
  const { update } = useChildCommands();
  const [childImage, setChildImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [removeChildImage, setRemoveChildImage] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const isSubmitting = update.isPending || isUploadingImage;

  function selectChildImageUpdate(file: File | null) {
    if (!file) {
      setChildImage(null);
      setImageError(null);
      setRemoveChildImage(Boolean(child.image));
      return;
    }

    const error = childImageError(file);
    if (error) {
      setImageError(error);
      return;
    }

    setChildImage(file);
    setImageError(null);
    setRemoveChildImage(false);
  }

  async function handleSubmit(values: UpdateChildFormValues) {
    if (imageError) throw new Error(imageError);

    let uploadedImagePath: string | null = null;
    setIsUploadingImage(Boolean(childImage));

    try {
      uploadedImagePath = childImage
        ? await uploadChildImage(childImage)
        : null;
      const image = uploadedImagePath ?? (removeChildImage ? null : child.image);
      await update.mutateAsync({
        id: child.id,
        input: toUpdateChildInput(values, image),
      });
      if (
        child.image &&
        child.image !== image &&
        child.image.startsWith("/api/child-images/files/serve/")
      ) {
        await deleteChildImage(child.image).catch(() => undefined);
      }
      await pop();
    } catch (error) {
      if (uploadedImagePath) {
        await deleteChildImage(uploadedImagePath).catch(() => undefined);
      }
      throw error;
    } finally {
      setIsUploadingImage(false);
    }
  }

  return (
    <NForm
      id="update-child-form"
      schema={updateChildFormSchema}
      defaultValues={{
        legalName: child.legalName,
        dateOfBirth: child.dateOfBirth,
        gender: child.gender === "M" ? "M" : "F",
        schoolLevel: child.schoolLevel ?? "",
        clothingSize: child.clothingSize ?? "",
        shoeSize: child.shoeSize ?? "",
        notes: child.notes ?? "",
      }}
      onSubmit={handleSubmit}
      devTools={useDevFormTools(updateChildFormSchema)}
    >
      <NFormSectionHeader icon={Baby} title="Child profile" />
      <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
        <ChildAvatarBlock
          disabled={isSubmitting}
          image={removeChildImage ? null : childImage ?? child.image}
          imageError={imageError}
          imageVersion={child.updatedAt}
          onImageChange={selectChildImageUpdate}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput name="legalName" type="text" formLabel={t("operator.families.legalName")} placeholder={t("operator.families.childLegalName")} icon="User" required />
          <FormInput name="dateOfBirth" type="date" formLabel={t("operator.families.dateOfBirth")} icon="Calendar" required />
          <FormInput
            name="gender"
            type="select"
            formLabel={t("operator.families.gender")}
            items={[
              { value: "F", label: t("operator.families.female") },
              { value: "M", label: t("operator.families.male") },
            ]}
            icon="Users"
            required
          />
          <FormInput name="schoolLevel" type="text" formLabel={t("operator.families.schoolLevel")} placeholder={t("operator.families.optional")} icon="GraduationCap" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormInput name="clothingSize" type="text" formLabel={t("operator.families.clothingSize")} placeholder={t("operator.families.optional")} icon="Shirt" />
        <FormInput name="shoeSize" type="text" formLabel={t("operator.families.shoeSize")} placeholder={t("operator.families.optional")} icon="Footprints" />
      </div>
      <FormInput name="notes" type="textarea" formLabel={t("operator.children.operatorNotes")} placeholder={t("operator.children.optionalNotes")} icon="NotebookPen" />
      <div className="flex justify-end pt-5">
        <NButton type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save child record"}
        </NButton>
      </div>
    </NForm>
  );
}

export function ChildStatusDialogContent({
  action,
  child,
}: Readonly<{
  action: "deactivate" | "reactivate";
  child: ChildRecord;
}>) {
  const { pop } = useDialog();
  const commands = useChildCommands();
  const command = commands[action];

  async function handleSubmit(values: ChildStatusFormValues) {
    await command.mutateAsync({ id: child.id, reason: values.reason });
    await pop();
  }

  return (
    <NForm
      id="child-status-form"
      schema={childStatusFormSchema}
      defaultValues={{ reason: "" }}
      onSubmit={handleSubmit}
      devTools={useDevFormTools(childStatusFormSchema)}
      className="space-y-5"
    >
      <p className="text-sm leading-6 text-muted-foreground">
        This preserves child history and records the operator reason in the audit log.
      </p>
      <FormInput
        name="reason"
        type="textarea"
        formLabel="Reason"
        placeholder={`Why should this child be ${action}d?`}
        icon="MessageSquareText"
        required
      />
      <div className="flex justify-end pt-5">
        <NButton
          type="submit"
          variant={action === "deactivate" ? "destructive" : "default"}
          disabled={command.isPending}
        >
          {command.isPending
            ? "Saving..."
            : action === "deactivate"
              ? "Deactivate child"
              : "Reactivate child"}
        </NButton>
      </div>
    </NForm>
  );
}

export function DeleteChildDialogContent({
  child,
}: Readonly<{ child: ChildRecord }>) {
  const { pop } = useDialog();
  const { remove } = useChildCommands();

  async function handleDelete() {
    await remove.mutateAsync(child.id);
    await pop();
  }

  return (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-muted-foreground">
        This permanently deletes the child record. It cannot be undone, and it
        is unavailable while support history still references this child.
      </p>
      <div className="flex justify-end pt-5">
        <NButton
          type="button"
          variant="destructive"
          disabled={remove.isPending}
          onClick={() => void handleDelete()}
        >
          {remove.isPending ? "Deleting..." : "Permanently delete child"}
        </NButton>
      </div>
    </div>
  );
}

export function BulkDeleteChildrenDialogContent({
  childIds,
  onDeleted,
}: Readonly<{ childIds: string[]; onDeleted: () => void }>) {
  const { pop } = useDialog();
  const { bulkRemove } = useChildCommands();
  const submittingRef = useRef(false);

  async function handleDelete() {
    if (submittingRef.current) return;
    submittingRef.current = true;

    try {
      await bulkRemove.mutateAsync(childIds);
      onDeleted();
      await pop();
    } catch {
      submittingRef.current = false;
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-muted-foreground">
        This permanently deletes {childIds.length} selected child records. It
        cannot be undone, and the whole request fails if linked support history
        prevents any selected child from being deleted.
      </p>
      <div className="flex justify-end pt-5">
        <NButton
          type="button"
          variant="destructive"
          disabled={bulkRemove.isPending}
          onClick={() => void handleDelete()}
        >
          {bulkRemove.isPending
            ? "Deleting selected children..."
            : "Permanently delete selected children"}
        </NButton>
      </div>
    </div>
  );
}
