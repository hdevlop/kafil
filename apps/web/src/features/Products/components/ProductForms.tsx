"use client";

import { FolderTree, Package, PackagePlus } from "lucide-react";
import { FormInput, ImageInput, NButton, NForm, NFormSectionHeader, useDebouncedValue, useDialog } from "najm-kit";
import { useState } from "react";

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
import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import { useProductCategories, useProductCommands } from "../hooks/useProducts";
import type { ProductCategory, ProductRecord } from "../types";

const MAX_PRODUCT_IMAGE_SIZE = 5_000_000;
const PRODUCT_IMAGE_TYPES = new Set([
  "image/avif",
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
  const { t } = useKafilLanguage();
  const [categorySearch, setCategorySearch] = useState("");
  const categories = useProductCategories(useDebouncedValue(categorySearch, 250));
  const options = categoryOptions(categories.data ?? [], product);

  return (
    <>
      <div className="space-y-2">
        <ImageInput
            accept="image/avif,image/jpeg,image/png,image/webp"
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
            formLabel={t("operator.products.activeCategory")}
            placeholder={categories.isPending ? t("operator.products.loadingCategories") : t("operator.products.chooseCategory")}
            searchPlaceholder={t("operator.products.searchCategories")}
            emptyMessage={t("operator.products.noActiveCategory")}
            loading={categories.isFetching}
            loadingMessage={t("operator.products.loadingCategories")}
            onSearchChange={setCategorySearch}
            shouldFilter={false}
            items={options}
            icon="Search"
            disabled={categories.isPending}
            required
          />
        </div>
        <FormInput name="name" type="text" formLabel={t("operator.products.name")} placeholder={t("operator.products.namePlaceholder")} icon={Package} required />
        <FormInput name="priceMad" type="text" formLabel={t("operator.products.price")} placeholder="45.00" icon="Banknote" required />
        <div className="md:col-span-2">
          <FormInput name="description" type="textarea" formLabel={t("operator.products.description")} placeholder={t("operator.products.descriptionPlaceholder")} icon="ReceiptText" />
        </div>
      </div>
    </>
  );
}

export function CreateProductDialogContent() {
  const { pop } = useDialog();
  const { t } = useKafilLanguage();
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
      devTools={{
        overrides: { categoryId: categoryOptions(categories.data ?? []) },
      }}
    >
      <NFormSectionHeader icon={PackagePlus} title={t("operator.products.catalogProduct")} />
      <ProductFields
        disabled={isUploading || create.isPending}
        image={image}
        imageError={imageError}
        imageVersion={imageVersion}
        onImageChange={selectImage}
      />
      <div className="flex justify-end pt-5">
        <NButton type="submit" disabled={create.isPending || isUploading || categories.isPending}>
          {isUploading ? t("operator.products.uploading") : create.isPending ? t("operator.products.creating") : t("operator.products.createProduct")}
        </NButton>
      </div>
    </NForm>
  );
}

export function UpdateProductDialogContent({ product }: Readonly<{ product: ProductRecord }>) {
  const { pop } = useDialog();
  const { t } = useKafilLanguage();
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
      devTools={{
        overrides: {
          categoryId: categoryOptions(categories.data ?? [], product),
        },
      }}
    >
      <NFormSectionHeader icon={FolderTree} title={t("operator.products.productDetails")} />
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
          {isUploading ? t("operator.products.uploading") : update.isPending ? t("operator.products.saving") : t("operator.products.saveProduct")}
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
  const { t } = useKafilLanguage();
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
      className="space-y-5"
    >
      <p className="text-sm leading-6 text-muted-foreground">
        {action === "deactivate"
          ? t("operator.products.deactivateHelp")
          : t("operator.products.activateHelp")}
      </p>
      <FormInput name="reason" type="textarea" formLabel={t("operator.products.reason")} placeholder={action === "deactivate" ? t("operator.products.deactivateReasonPlaceholder") : t("operator.products.activateReasonPlaceholder")} icon="MessageSquareText" required />
      <div className="flex justify-end pt-5">
        <NButton type="submit" variant={action === "deactivate" ? "destructive" : "default"} disabled={command.isPending}>
          {command.isPending ? t("operator.products.saving") : action === "deactivate" ? t("operator.products.deactivateProduct") : t("operator.products.activateProduct")}
        </NButton>
      </div>
    </NForm>
  );
}

export function DeleteProductDialogContent({
  product,
}: Readonly<{ product: ProductRecord }>) {
  const { pop } = useDialog();
  const { t } = useKafilLanguage();
  const { remove } = useProductCommands();

  async function handleDelete() {
    try {
      await remove.mutateAsync(product.id);
      await pop();
    } catch {
      // useEntityCommand already presents the API error to the user.
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-muted-foreground">
        Permanently deletes this product, its cart entries, and the related
        storage image. Has no effect on order or inventory history, or the
        audit log. The command refuses with a 409 if the product has history
        or non-zero inventory — use deactivate instead.
      </p>
      <div className="flex justify-end pt-5">
        <NButton
          type="button"
          variant="destructive"
          disabled={remove.isPending}
          onClick={() => void handleDelete()}
        >
          {remove.isPending ? t("operator.products.deleting") : t("operator.products.deleteProduct")}
        </NButton>
      </div>
    </div>
  );
}
