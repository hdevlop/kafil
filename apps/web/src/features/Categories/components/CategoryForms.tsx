"use client";

import { ListOrdered, Tags } from "lucide-react";
import { FormInput, ImageInput, NButton, NForm, NFormSectionHeader, useDialog } from "najm-kit";
import { useState } from "react";

import { useTranslation } from "najm-i18n/react";
import type { TFn } from "najm-i18n";
import type { UiTranslationKey } from "@kafil/server/locales";

import {
  categoryStatusFormSchema,
  createCategoryFormSchema,
  toCategoryStatusInput,
  toCreateCategoryInput,
  toUpdateCategoryInput,
  updateCategoryFormSchema,
  type CategoryStatusFormValues,
  type CreateCategoryFormValues,
  type UpdateCategoryFormValues,
} from "../config/categorySchemas";
import { useCategoryCommands } from "../hooks/useCategories";
import type { CategoryRecord } from "../types";
import { deleteCategoryImage, uploadCategoryImage } from "@/services/categoryApi";

const MAX_CATEGORY_IMAGE_SIZE = 5_000_000;
const CATEGORY_IMAGE_TYPES = new Set([
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function categoryImageError(
  file: File,
  t: TFn<UiTranslationKey>,
) {
  if (!CATEGORY_IMAGE_TYPES.has(file.type)) {
    return t("operator.categories.imageTypeError");
  }
  if (file.size > MAX_CATEGORY_IMAGE_SIZE) {
    return t("operator.categories.imageSizeError");
  }
  return null;
}

function CategoryFields({
  disabled,
  image,
  imageError,
  imageVersion,
  onImageChange,
}: Readonly<{
  disabled: boolean;
  image: File | string | null;
  imageError: string | null;
  imageVersion?: number;
  onImageChange: (file: File | null) => void;
}>) {
  const { t } = useTranslation();

  return (
    <>
      <div className="space-y-2">
        <ImageInput
          accept="image/avif,image/jpeg,image/png,image/webp"
          buttonLabel={t("operator.categories.imageButton")}
          disabled={disabled}
          imageVersion={String(imageVersion ?? 0)}
          previewClassName="h-44 w-full"
          replaceSubtitle={t("operator.categories.imageReplaceGuidance")}
          replaceTitle={t("operator.categories.imageReplaceTitle")}
          subtitle={t("operator.categories.imageUploadGuidance")}
          title={t("operator.categories.imageUploadTitle")}
          value={image}
          onChange={onImageChange}
        />
        {imageError ? (
          <p className="text-center text-xs text-destructive">{imageError}</p>
        ) : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <FormInput name="name" type="text" formLabel={t("operator.categories.name")} placeholder={t("operator.categories.namePlaceholder")} icon="Tags" required />
        <FormInput name="sortOrder" type="number" formLabel={t("operator.categories.displayOrder")} placeholder="1" icon="ListOrdered" required />
        <div className="md:col-span-2">
          <FormInput name="description" type="textarea" formLabel={t("operator.categories.description")} placeholder={t("operator.categories.descriptionPlaceholder")} icon="AlignJustify" />
        </div>
      </div>
    </>
  );
}

export function CreateCategoryDialogContent() {
  const { pop } = useDialog();
  const { t } = useTranslation();
  const { create } = useCategoryCommands();
  const [image, setImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageVersion, setImageVersion] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  function selectImage(file: File | null) {
    if (!file) {
      setImage(null);
      setImageError(null);
      return;
    }
    const error = categoryImageError(file, t);
    if (error) {
      setImageError(error);
      return;
    }
    setImage(file);
    setImageError(null);
    setImageVersion((version) => version + 1);
  }

  async function handleSubmit(values: CreateCategoryFormValues) {
    let uploadedImagePath: string | null = null;
    setIsUploading(Boolean(image));

    try {
      uploadedImagePath = image ? await uploadCategoryImage(image) : null;
      await create.mutateAsync({
        ...toCreateCategoryInput(values),
        image: uploadedImagePath,
      });
      await pop();
    } catch (error) {
      if (uploadedImagePath) {
        await deleteCategoryImage(uploadedImagePath).catch(() => undefined);
      }
      throw error;
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <NForm
      id="create-category-form"
      schema={createCategoryFormSchema}
      defaultValues={{ name: "", description: "", sortOrder: 0 }}
      onSubmit={handleSubmit}
    >
      <NFormSectionHeader icon={Tags} title={t("operator.categories.sectionTitle")} />
      <CategoryFields
        disabled={isUploading || create.isPending}
        image={image}
        imageError={imageError}
        imageVersion={imageVersion}
        onImageChange={selectImage}
      />
      <div className="flex justify-end pt-5">
        <NButton type="submit" disabled={create.isPending || isUploading}>
          {isUploading
            ? t("operator.categories.uploading")
            : create.isPending
              ? t("operator.categories.creating")
              : t("operator.categories.create")}
        </NButton>
      </div>
    </NForm>
  );
}

export function UpdateCategoryDialogContent({ category }: Readonly<{ category: CategoryRecord }>) {
  const { pop } = useDialog();
  const { t } = useTranslation();
  const { update } = useCategoryCommands();
  const [image, setImage] = useState<File | string | null>(category.image);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageVersion, setImageVersion] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  function selectImage(file: File | null) {
    if (!file) {
      setImage(null);
      setImageError(null);
      return;
    }
    const error = categoryImageError(file, t);
    if (error) {
      setImageError(error);
      return;
    }
    setImage(file);
    setImageError(null);
    setImageVersion((version) => version + 1);
  }

  async function handleSubmit(values: UpdateCategoryFormValues) {
    let uploadedImagePath: string | null | undefined;
    setIsUploading(image instanceof File);

    try {
      if (image instanceof File) {
        uploadedImagePath = await uploadCategoryImage(image);
      } else if (image === null && category.image) {
        uploadedImagePath = null;
      }

      await update.mutateAsync({
        id: category.id,
        input: {
          ...toUpdateCategoryInput(values),
          ...(uploadedImagePath !== undefined ? { image: uploadedImagePath } : {}),
        },
      });

      if (
        uploadedImagePath !== undefined &&
        category.image &&
        category.image !== uploadedImagePath
      ) {
        await deleteCategoryImage(category.image).catch(() => undefined);
      }

      await pop();
    } catch (error) {
      if (uploadedImagePath) {
        await deleteCategoryImage(uploadedImagePath).catch(() => undefined);
      }
      throw error;
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <NForm
      id="update-category-form"
      schema={updateCategoryFormSchema}
      defaultValues={{
        name: category.name,
        description: category.description ?? "",
        sortOrder: category.sortOrder,
      }}
      onSubmit={handleSubmit}
    >
      <NFormSectionHeader icon={ListOrdered} title={t("operator.categories.detailsTitle")} />
      <CategoryFields
        disabled={isUploading || update.isPending}
        image={image}
        imageError={imageError}
        imageVersion={imageVersion}
        onImageChange={selectImage}
      />
      <div className="flex justify-end pt-5">
        <NButton type="submit" disabled={update.isPending || isUploading}>
          {isUploading
            ? t("operator.categories.uploading")
            : update.isPending
              ? t("operator.categories.saving")
              : t("operator.categories.save")}
        </NButton>
      </div>
    </NForm>
  );
}

export function CategoryStatusDialogContent({
  action,
  category,
}: Readonly<{
  action: "activate" | "deactivate";
  category: CategoryRecord;
}>) {
  const { pop } = useDialog();
  const { t } = useTranslation();
  const commands = useCategoryCommands();
  const command = commands[action];

  async function handleSubmit(values: CategoryStatusFormValues) {
    await command.mutateAsync(toCategoryStatusInput(category.id, values));
    await pop();
  }

  return (
    <NForm
      id={`${action}-category-form`}
      schema={categoryStatusFormSchema}
      defaultValues={{ reason: "" }}
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      <p className="text-sm leading-6 text-muted-foreground">
        {action === "deactivate"
          ? t("operator.categories.deactivateHelp")
          : t("operator.categories.activateHelp")}
      </p>
      <FormInput
        name="reason"
        type="textarea"
        formLabel={t("operator.categories.reason")}
        placeholder={t(
          action === "deactivate"
            ? "operator.categories.deactivateReasonPlaceholder"
            : "operator.categories.activateReasonPlaceholder",
        )}
        icon="MessageSquareText"
        required
      />
      <div className="flex justify-end pt-5">
        <NButton type="submit" variant={action === "deactivate" ? "destructive" : "default"} disabled={command.isPending}>
          {command.isPending
            ? t("operator.categories.saving")
            : t(
                action === "deactivate"
                  ? "operator.categories.deactivate"
                  : "operator.categories.activate",
              )}
        </NButton>
      </div>
    </NForm>
  );
}

export function DeleteCategoryDialogContent({
  category,
}: Readonly<{ category: CategoryRecord }>) {
  const { pop } = useDialog();
  const { t } = useTranslation();
  const { remove } = useCategoryCommands();

  async function handleDelete() {
    try {
      await remove.mutateAsync(category.id);
      await pop();
    } catch {
      // useEntityCommand already presents the API error to the user.
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-muted-foreground">
        {t("operator.categories.deleteWarning")}
      </p>
      <div className="flex justify-end pt-5">
        <NButton
          type="button"
          variant="destructive"
          disabled={remove.isPending}
          onClick={() => void handleDelete()}
        >
          {remove.isPending
            ? t("operator.categories.deleting")
            : t("operator.categories.delete")}
        </NButton>
      </div>
    </div>
  );
}
