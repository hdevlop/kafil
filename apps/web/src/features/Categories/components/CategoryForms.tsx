"use client";

import { ListOrdered, Tags } from "lucide-react";
import { FormInput, ImageInput, NButton, NForm, NFormSectionHeader, useDialog } from "najm-kit";
import { useState } from "react";

import { devFormTools } from "@/lib/devFormFill";

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
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function categoryImageError(file: File) {
  if (!CATEGORY_IMAGE_TYPES.has(file.type)) {
    return "Select a PNG, JPEG, WebP, AVIF, or GIF image.";
  }
  if (file.size > MAX_CATEGORY_IMAGE_SIZE) return "Image must be 5 MB or smaller.";
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
  return (
    <>
      <div className="space-y-2">
        <ImageInput
          accept="image/avif,image/gif,image/jpeg,image/png,image/webp"
          disabled={disabled}
          imageVersion={String(imageVersion ?? 0)}
          previewClassName="h-44 w-full"
          value={image}
          onChange={onImageChange}
        />
        {imageError ? (
          <p className="text-center text-xs text-destructive">{imageError}</p>
        ) : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <FormInput name="name" type="text" formLabel="Name" placeholder="Food essentials" icon="Tags" required />
        <FormInput name="sortOrder" type="number" formLabel="Display order" placeholder="1" icon="ListOrdered" required />
        <div className="md:col-span-2">
          <FormInput name="description" type="textarea" formLabel="Description" placeholder="Optional category description" icon="AlignJustify" />
        </div>
      </div>
    </>
  );
}

export function CreateCategoryDialogContent() {
  const { pop } = useDialog();
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
    const error = categoryImageError(file);
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
      devTools={devFormTools(createCategoryFormSchema)}
    >
      <NFormSectionHeader icon={Tags} title="Catalog category" />
      <CategoryFields
        disabled={isUploading || create.isPending}
        image={image}
        imageError={imageError}
        imageVersion={imageVersion}
        onImageChange={selectImage}
      />
      <div className="flex justify-end pt-5">
        <NButton type="submit" disabled={create.isPending || isUploading}>
          {isUploading ? "Uploading..." : create.isPending ? "Creating..." : "Create category"}
        </NButton>
      </div>
    </NForm>
  );
}

export function UpdateCategoryDialogContent({ category }: Readonly<{ category: CategoryRecord }>) {
  const { pop } = useDialog();
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
    const error = categoryImageError(file);
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
      devTools={devFormTools(updateCategoryFormSchema)}
    >
      <NFormSectionHeader icon={ListOrdered} title="Category details" />
      <CategoryFields
        disabled={isUploading || update.isPending}
        image={image}
        imageError={imageError}
        imageVersion={imageVersion}
        onImageChange={selectImage}
      />
      <div className="flex justify-end pt-5">
        <NButton type="submit" disabled={update.isPending || isUploading}>
          {isUploading ? "Uploading..." : update.isPending ? "Saving..." : "Save category"}
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
      devTools={devFormTools(categoryStatusFormSchema)}
      className="space-y-5"
    >
      <p className="text-sm leading-6 text-muted-foreground">
        {action === "deactivate"
          ? "Deactivation keeps existing product and order history while hiding this category from the active catalog."
          : "Activation makes this category available for active catalog use again."}
      </p>
      <FormInput name="reason" type="textarea" formLabel="Reason" placeholder={`Why should this category be ${action}d?`} icon="MessageSquareText" required />
      <div className="flex justify-end pt-5">
        <NButton type="submit" variant={action === "deactivate" ? "destructive" : "default"} disabled={command.isPending}>
          {command.isPending ? "Saving..." : action === "deactivate" ? "Deactivate category" : "Activate category"}
        </NButton>
      </div>
    </NForm>
  );
}
