"use client";

import { FolderTree, Package, PackagePlus } from "lucide-react";
import { FormInput, ImageInput, NButton, NForm, NFormSectionHeader, useDialog } from "najm-kit";
import { useState } from "react";

import { devFormTools } from "@/lib/devFormFill";
import { deleteProductImage, uploadProductImage } from "@/services/productApi";

import {
  createProductFormSchema,
  productStatusFormSchema,
  toCreateProductInput,
  toProductStatusInput,
  toUpdateProductInput,
  updateProductFormSchema,
  type CreateProductFormValues,
  type ProductStatusFormValues,
  type UpdateProductFormValues,
} from "../config/productSchemas";
import { useProductCategories, useProductCommands } from "../hooks/useProducts";
import type { ProductCategory, ProductRecord } from "../types";

const MAX_PRODUCT_IMAGE_SIZE = 5_000_000;
const PRODUCT_IMAGE_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function productImageError(file: File) {
  if (!PRODUCT_IMAGE_TYPES.has(file.type)) {
    return "Select a PNG, JPEG, WebP, AVIF, or GIF image.";
  }
  if (file.size > MAX_PRODUCT_IMAGE_SIZE) return "Image must be 5 MB or smaller.";
  return null;
}

function categoryOptions(categories: ProductCategory[], product?: ProductRecord) {
  const activeOptions = categories.map((category) => ({
    value: category.id,
    label: `${category.name} — ${category.slug}`,
  }));

  if (product && !categories.some((category) => category.id === product.categoryId)) {
    activeOptions.unshift({
      value: product.categoryId,
      label: `${product.categoryName} — ${product.categorySlug} (current inactive category)`,
    });
  }

  return activeOptions;
}

function ProductFields({
  disabled,
  image,
  imageError,
  imageVersion,
  onImageChange,
  product,
}: Readonly<{
  disabled: boolean;
  image: File | string | null;
  imageError: string | null;
  imageVersion?: number;
  onImageChange: (file: File | null) => void;
  product?: ProductRecord;
}>) {
  const categories = useProductCategories();
  const options = categoryOptions(categories.data ?? [], product);

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
        <div className="md:col-span-2">
          <FormInput
            name="categoryId"
            type="combobox"
            formLabel="Active category"
            placeholder={categories.isPending ? "Loading categories..." : "Choose a category"}
            searchPlaceholder="Search categories..."
            emptyMessage="No active category found. Create and activate one first."
            items={options}
            icon="Search"
            disabled={categories.isPending}
            required
          />
        </div>
        <FormInput name="name" type="text" formLabel="Product name" placeholder="Rice 5 kg" icon={Package} required />
        <FormInput name="priceMad" type="text" formLabel="Price (MAD)" placeholder="45.00" icon="Banknote" required />
        <div className="md:col-span-2">
          <FormInput name="description" type="textarea" formLabel="Description" placeholder="Optional product description" icon="ReceiptText" />
        </div>
      </div>
    </>
  );
}

export function CreateProductDialogContent() {
  const { pop } = useDialog();
  const { create } = useProductCommands();
  const categories = useProductCategories();
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
    const error = productImageError(file);
    if (error) {
      setImageError(error);
      return;
    }
    setImage(file);
    setImageError(null);
    setImageVersion((version) => version + 1);
  }

  async function handleSubmit(values: CreateProductFormValues) {
    let uploadedImagePath: string | null = null;
    setIsUploading(Boolean(image));

    try {
      uploadedImagePath = image ? await uploadProductImage(image) : null;
      await create.mutateAsync({
        ...toCreateProductInput(values),
        imageUrl: uploadedImagePath,
      });
      await pop();
    } catch (error) {
      if (uploadedImagePath) {
        await deleteProductImage(uploadedImagePath).catch(() => undefined);
      }
      throw error;
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <NForm
      id="create-product-form"
      schema={createProductFormSchema}
      defaultValues={{ categoryId: "", name: "", priceMad: "", imageUrl: "", description: "" }}
      onSubmit={handleSubmit}
      devTools={devFormTools(createProductFormSchema, {
        categoryId: categoryOptions(categories.data ?? []),
      })}
    >
      <NFormSectionHeader icon={PackagePlus} title="Catalog product" />
      <ProductFields
        disabled={isUploading || create.isPending}
        image={image}
        imageError={imageError}
        imageVersion={imageVersion}
        onImageChange={selectImage}
      />
      <div className="flex justify-end pt-5">
        <NButton type="submit" disabled={create.isPending || isUploading || categories.isPending}>
          {isUploading ? "Uploading..." : create.isPending ? "Creating..." : "Create product"}
        </NButton>
      </div>
    </NForm>
  );
}

export function UpdateProductDialogContent({ product }: Readonly<{ product: ProductRecord }>) {
  const { pop } = useDialog();
  const { update } = useProductCommands();
  const categories = useProductCategories();
  const [image, setImage] = useState<File | string | null>(product.imageUrl);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageVersion, setImageVersion] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  function selectImage(file: File | null) {
    if (!file) {
      setImage(null);
      setImageError(null);
      return;
    }
    const error = productImageError(file);
    if (error) {
      setImageError(error);
      return;
    }
    setImage(file);
    setImageError(null);
    setImageVersion((version) => version + 1);
  }

  async function handleSubmit(values: UpdateProductFormValues) {
    let uploadedImagePath: string | null | undefined;
    setIsUploading(image instanceof File);

    try {
      if (image instanceof File) {
        uploadedImagePath = await uploadProductImage(image);
      } else if (image === null && product.imageUrl) {
        uploadedImagePath = null;
      }

      await update.mutateAsync({
        id: product.id,
        input: {
          ...toUpdateProductInput(product, values),
          ...(uploadedImagePath !== undefined ? { imageUrl: uploadedImagePath } : {}),
        },
      });

      if (
        uploadedImagePath !== undefined &&
        product.imageUrl &&
        product.imageUrl !== uploadedImagePath
      ) {
        await deleteProductImage(product.imageUrl).catch(() => undefined);
      }

      await pop();
    } catch (error) {
      if (uploadedImagePath) {
        await deleteProductImage(uploadedImagePath).catch(() => undefined);
      }
      throw error;
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <NForm
      id="update-product-form"
      schema={updateProductFormSchema}
      defaultValues={{
        categoryId: product.categoryId,
        name: product.name,
        priceMad: (product.priceMinor / 100).toFixed(2),
        imageUrl: product.imageUrl ?? "",
        description: product.description ?? "",
      }}
      onSubmit={handleSubmit}
      devTools={devFormTools(updateProductFormSchema, {
        categoryId: categoryOptions(categories.data ?? [], product),
      })}
    >
      <NFormSectionHeader icon={FolderTree} title="Product details" />
      <ProductFields
        disabled={isUploading || update.isPending}
        image={image}
        imageError={imageError}
        imageVersion={imageVersion}
        onImageChange={selectImage}
        product={product}
      />
      <div className="flex justify-end pt-5">
        <NButton type="submit" disabled={update.isPending || isUploading || categories.isPending}>
          {isUploading ? "Uploading..." : update.isPending ? "Saving..." : "Save product"}
        </NButton>
      </div>
    </NForm>
  );
}

export function ProductStatusDialogContent({
  action,
  product,
}: Readonly<{
  action: "activate" | "deactivate";
  product: ProductRecord;
}>) {
  const { pop } = useDialog();
  const commands = useProductCommands();
  const command = commands[action];

  async function handleSubmit(values: ProductStatusFormValues) {
    await command.mutateAsync(toProductStatusInput(product.id, values));
    await pop();
  }

  return (
    <NForm
      id={`${action}-product-form`}
      schema={productStatusFormSchema}
      defaultValues={{ reason: "" }}
      onSubmit={handleSubmit}
      devTools={devFormTools(productStatusFormSchema)}
      className="space-y-5"
    >
      <p className="text-sm leading-6 text-muted-foreground">
        {action === "deactivate"
          ? "Deactivation preserves product, inventory, and order history while removing this product from the active catalog."
          : "Activation requires the product's category to remain active."}
      </p>
      <FormInput name="reason" type="textarea" formLabel="Reason" placeholder={`Why should this product be ${action}d?`} icon="MessageSquareText" required />
      <div className="flex justify-end pt-5">
        <NButton type="submit" variant={action === "deactivate" ? "destructive" : "default"} disabled={command.isPending}>
          {command.isPending ? "Saving..." : action === "deactivate" ? "Deactivate product" : "Activate product"}
        </NButton>
      </div>
    </NForm>
  );
}
