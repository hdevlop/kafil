"use client";

import { useEffect, useState } from "react";
import { Baby, UserRoundPlus } from "lucide-react";
import {
  DynamicArray,
  FormInput,
  ImageInput,
  NButton,
  NForm,
  NFormSectionHeader,
  WizardForm,
  useDialog,
} from "najm-kit";
import type { StepConfig } from "najm-kit";

import { devFormTools, isDevFormFillEnabled } from "@/lib/devFormFill";
import { minorUnitsToMadInput } from "@/features/Budgets/config/budgetSchemas";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { InitialCredentialsCard } from "@/shared/InitialCredentialsCard";

import {
  createFamilyFormSchema,
  familyStatusFormSchema,
  toCreateFamilyInput,
  toUpdateFamilyInput,
  updateFamilyFormSchema,
  type CreateFamilyFormValues,
  type FamilyStatusFormValues,
  type UpdateFamilyFormValues,
} from "../config/familySchemas";
import { useFamilyCommands } from "../hooks/useFamilies";
import type { FamilyRecord } from "../types";
import {
  deleteFamilyImage,
  uploadFamilyImage,
} from "@/services/familyApi";

const MAX_FAMILY_IMAGE_SIZE = 5_000_000;
const FAMILY_IMAGE_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function createFamilyDefaultValues(): CreateFamilyFormValues {
  return {
    name: "",
    email: "",
    guardianCin: "",
    guardianDateOfBirth: "",
    exactAddress: "",
    phone: "",
    activationTargetMad: "",
    initialChildren: [],
    relationshipToChildren: "",
    notes: "",
  };
}

function createFamilyDevFillValues(): CreateFamilyFormValues {
  const generatedFamily = devFormTools(createFamilyFormSchema).fill();
  const firstChild = generatedFamily.initialChildren?.[0];

  if (!firstChild) {
    return createFamilyFormSchema.parse({
      ...createFamilyDefaultValues(),
      ...generatedFamily,
      initialChildren: [],
    });
  }

  const childCount = Math.floor(Math.random() * 4) + 1;
  const initialChildren = Array.from({ length: childCount }, () =>
    devFormTools(createFamilyFormSchema).fill().initialChildren?.[0] ?? firstChild,
  );

  return createFamilyFormSchema.parse({
    ...createFamilyDefaultValues(),
    ...generatedFamily,
    initialChildren,
  });
}

function familyImageError(file: File) {
  if (!FAMILY_IMAGE_TYPES.has(file.type)) {
    return "Select a PNG, JPEG, WebP, AVIF, or GIF image.";
  }
  if (file.size > MAX_FAMILY_IMAGE_SIZE) return "Image must be 5 MB or smaller.";
  return null;
}

function InitialChildFields() {
  const { t } = useKafilLanguage();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FormInput
        name="legalName"
        type="text"
        formLabel={t("operator.families.legalName")}
        placeholder={t("operator.families.childLegalName")}
        icon="User"
        required
      />
      <FormInput
        name="dateOfBirth"
        type="date"
        formLabel={t("operator.families.dateOfBirth")}
        icon="Calendar"
        required
      />
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
      <FormInput
        name="schoolLevel"
        type="text"
        formLabel={t("operator.families.schoolLevel")}
        placeholder={t("operator.families.optional")}
        icon="GraduationCap"
      />
      <FormInput
        name="clothingSize"
        type="text"
        formLabel={t("operator.families.clothingSize")}
        placeholder={t("operator.families.optional")}
        icon="Shirt"
      />
      <FormInput
        name="shoeSize"
        type="text"
        formLabel={t("operator.families.shoeSize")}
        placeholder={t("operator.families.optional")}
        icon="Footprints"
      />
      <div className="md:col-span-2">
        <FormInput
          name="notes"
          type="textarea"
          formLabel={t("operator.families.childNotes")}
          placeholder={t("operator.families.optionalOperatorNotes")}
          icon="NotebookPen"
        />
      </div>
    </div>
  );
}

function FamilyProfileFields({
  disabled,
  image,
  imageError,
  imageVersion,
  onImageChange,
  showSectionHeader = true,
}: Readonly<{
  disabled: boolean;
  image: File | string | null;
  imageError: string | null;
  imageVersion?: string | null;
  onImageChange: (file: File | null) => void;
  showSectionHeader?: boolean;
}>) {
  const { t } = useKafilLanguage();

  return (
    <>
      {showSectionHeader ? (
        <NFormSectionHeader
          icon={UserRoundPlus}
          title={t("operator.families.profile")}
        />
      ) : null}
      <div className="space-y-2">
          <ImageInput
            accept="image/avif,image/gif,image/jpeg,image/png,image/webp"
            disabled={disabled}
            imageVersion={imageVersion}
            previewClassName="h-52 w-full"
            value={image}
            onChange={onImageChange}
          />
          {imageError ? (
            <p className="text-center text-xs text-destructive">
              {imageError}
            </p>
          ) : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
          <FormInput
            name="name"
            type="text"
            formLabel={t("operator.families.guardianName")}
            placeholder={t("operator.families.fullName")}
            icon="User"
            required
          />
          <FormInput
            name="guardianCin"
            type="text"
            formLabel={t("operator.families.guardianCin")}
            placeholder={t("operator.families.cinExample")}
            icon="FileKey2"
            required
          />
          <FormInput
            name="email"
            type="text"
            formLabel={t("operator.families.email")}
            placeholder="family@example.com"
            icon="Mail"
            required
          />
          <FormInput
            name="guardianDateOfBirth"
            type="date"
            formLabel={t("operator.families.guardianDateOfBirth")}
            icon="Calendar"
            required
          />
          <FormInput
            name="relationshipToChildren"
            type="text"
            formLabel={t("operator.families.relationship")}
            placeholder={t("operator.families.relationshipExample")}
            icon="HeartHandshake"
          />
          <FormInput
            name="activationTargetMad"
            type="text"
            formLabel={t("operator.families.activationTarget")}
            placeholder={t("operator.families.targetExample")}
            icon="CircleDollarSign"
            required
          />
          <FormInput
            name="phone"
            type="text"
            formLabel={t("operator.families.householdPhone")}
            placeholder={t("operator.families.optional")}
            icon="Phone"
            required
          />
          <div>
            <FormInput
              name="exactAddress"
              type="textarea"
              formLabel={t("operator.families.exactAddress")}
              placeholder={t("operator.families.fullAddress")}
              icon="MapPin"
            />
          </div>
          <div>
            <FormInput
              name="notes"
              type="textarea"
              formLabel={t("operator.families.familyNotes")}
              placeholder={t("operator.families.optionalOperatorNotes")}
              icon="NotebookPen"
            />
          </div>
      </div>
    </>
  );
}

function FamilyChildrenFields({
  showSectionHeader = true,
}: Readonly<{ showSectionHeader?: boolean }>) {
  const { t } = useKafilLanguage();

  return (
    <>
      {showSectionHeader ? (
        <NFormSectionHeader
          icon={Baby}
          title={t("operator.families.initialChildren")}
        />
      ) : null}
      <DynamicArray
        name="initialChildren"
        title={t("operator.families.child")}
        addLabel={t("operator.families.addChild")}
        emptyLabel={t("operator.families.noChild")}
        onAdd={(append) =>
          append({
            legalName: "",
            dateOfBirth: "",
            gender: "F",
            schoolLevel: "",
            clothingSize: "",
            shoeSize: "",
            notes: "",
          })
        }
      >
        <InitialChildFields />
      </DynamicArray>
    </>
  );
}

export function CreateFamilyDialogContent() {
  const { t } = useKafilLanguage();
  const { pop } = useDialog();
  const { create } = useFamilyCommands();
  const [familyImage, setFamilyImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [wizardKey, setWizardKey] = useState(0);
  const [wizardDefaultValues, setWizardDefaultValues] = useState(
    createFamilyDefaultValues,
  );
  const [credentials, setCredentials] = useState<{
    password: string;
    phone: string;
  } | null>(null);
  const isSubmitting = create.isPending || isUploadingImage;

  useEffect(() => {
    if (!isDevFormFillEnabled) return;

    function fillForm(event: KeyboardEvent) {
      if (event.key !== "F8") return;

      event.preventDefault();
      setFamilyImage(null);
      setImageError(null);
      setWizardDefaultValues(createFamilyDevFillValues());
      setWizardKey((key) => key + 1);
    }

    window.addEventListener("keydown", fillForm, true);
    return () => window.removeEventListener("keydown", fillForm, true);
  }, []);

  const steps: StepConfig[] = [
    {
      id: "family-profile",
      title: t("operator.families.profile"),
      fields: [
        "name",
        "email",
        "guardianCin",
        "guardianDateOfBirth",
        "exactAddress",
        "phone",
        "activationTargetMad",
        "relationshipToChildren",
        "notes",
      ],
      render: () => (
        <FamilyProfileFields
          disabled={isSubmitting}
          image={familyImage}
          imageError={imageError}
          onImageChange={selectFamilyImage}
          showSectionHeader={false}
        />
      ),
    },
    {
      id: "initial-children",
      title: t("operator.families.initialChildren"),
      fields: ["initialChildren"],
      render: () => <FamilyChildrenFields showSectionHeader={false} />,
    },
  ];

  function selectFamilyImage(file: File | null) {
    if (!file) {
      setFamilyImage(null);
      setImageError(null);
      return;
    }

    const error = familyImageError(file);
    if (error) {
      setImageError(error);
      return;
    }

    setFamilyImage(file);
    setImageError(null);
  }

  async function handleSubmit(values: CreateFamilyFormValues) {
    let uploadedImagePath: string | null = null;
    setIsUploadingImage(Boolean(familyImage));

    try {
      uploadedImagePath = familyImage
        ? await uploadFamilyImage(familyImage)
        : null;
      const created = await create.mutateAsync({
        ...toCreateFamilyInput(values),
        image: uploadedImagePath,
      });
      setCredentials({ password: created.initialPassword, phone: values.phone });
    } catch (error) {
      if (uploadedImagePath) {
        await deleteFamilyImage(uploadedImagePath).catch(() => undefined);
      }
      throw error;
    } finally {
      setIsUploadingImage(false);
    }
  }

  return (
    <div className="h-full min-h-0" aria-busy={isSubmitting}>
      {credentials ? (
        <InitialCredentialsCard
          password={credentials.password}
          phone={credentials.phone}
          onDone={() => void pop()}
        />
      ) : (
      <WizardForm
        key={wizardKey}
        steps={steps}
        schema={createFamilyFormSchema}
        defaultValues={wizardDefaultValues}
        onSubmit={handleSubmit}
        nextLabel={t("operator.families.next")}
        previousLabel={t("operator.families.previous")}
        submitLabel={
          isSubmitting
            ? t("operator.families.creating")
            : t("operator.families.createAndInvite")
        }
        className={isSubmitting ? "pointer-events-none select-none" : undefined}
        classNames={{
          root: "h-full min-h-0",
          step: "pb-4",
          footer: "sticky bottom-0 z-10 bg-background pt-3",
        }}
      />
      )}
    </div>
  );
}

export function UpdateFamilyDialogContent({
  family,
}: Readonly<{ family: FamilyRecord }>) {
  const { t } = useKafilLanguage();
  const { pop } = useDialog();
  const { update } = useFamilyCommands();
  const [familyImage, setFamilyImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [removeFamilyImage, setRemoveFamilyImage] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  function selectFamilyImage(file: File | null) {
    if (!file) {
      setFamilyImage(null);
      setImageError(null);
      setRemoveFamilyImage(Boolean(family.image));
      return;
    }

    const error = familyImageError(file);
    if (error) {
      setImageError(error);
      return;
    }

    setFamilyImage(file);
    setImageError(null);
    setRemoveFamilyImage(false);
  }

  async function handleSubmit(values: UpdateFamilyFormValues) {
    let uploadedImagePath: string | null = null;
    setIsUploadingImage(Boolean(familyImage));

    try {
      uploadedImagePath = familyImage
        ? await uploadFamilyImage(familyImage)
        : null;
      const image = uploadedImagePath ?? (removeFamilyImage ? null : family.image);
      await update.mutateAsync({
        id: family.id,
        input: { ...toUpdateFamilyInput(values), image },
      });
      if (
        family.image &&
        family.image !== image &&
        family.image.startsWith("/api/family-images/files/serve/")
      ) {
        await deleteFamilyImage(family.image).catch(() => undefined);
      }
      await pop();
    } catch (error) {
      if (uploadedImagePath) {
        await deleteFamilyImage(uploadedImagePath).catch(() => undefined);
      }
      throw error;
    } finally {
      setIsUploadingImage(false);
    }
  }

  return (
    <NForm
      id="update-family-form"
      schema={updateFamilyFormSchema}
      defaultValues={{
        name: family.name,
        email: family.email,
        guardianCin: family.guardianCin ?? "",
        guardianDateOfBirth: family.guardianDateOfBirth ?? "",
        exactAddress: family.exactAddress,
        phone: family.phone ?? "",
        relationshipToChildren: family.relationshipToChildren ?? "",
        notes: family.notes ?? "",
        activationTargetMad: family.funding
          ? minorUnitsToMadInput(family.funding.targetMinor)
          : "",
      }}
      onSubmit={handleSubmit}
      devTools={devFormTools(updateFamilyFormSchema)}
    >
      <FamilyProfileFields
        disabled={update.isPending || isUploadingImage}
        image={removeFamilyImage ? null : familyImage ?? family.image}
        imageError={imageError}
        imageVersion={family.updatedAt}
        onImageChange={selectFamilyImage}
      />
      <div className="flex justify-end pt-5">
        <NButton type="submit" disabled={update.isPending || isUploadingImage}>
          {update.isPending || isUploadingImage
            ? t("operator.families.saving")
            : t("operator.families.saveProfile")}
        </NButton>
      </div>
    </NForm>
  );
}

export function FamilyStatusDialogContent({
  action,
  family,
}: Readonly<{
  action: "deactivate" | "reactivate";
  family: FamilyRecord;
}>) {
  const { t } = useKafilLanguage();
  const { pop } = useDialog();
  const commands = useFamilyCommands();
  const command = commands[action];

  async function handleSubmit(values: FamilyStatusFormValues) {
    await command.mutateAsync({ id: family.id, reason: values.reason });
    await pop();
  }

  return (
    <NForm
      id="family-status-form"
      schema={familyStatusFormSchema}
      defaultValues={{ reason: "" }}
      onSubmit={handleSubmit}
      devTools={devFormTools(familyStatusFormSchema)}
    >
      <FormInput
        name="reason"
        type="textarea"
        formLabel={t("operator.families.reason")}
        placeholder={t("operator.families.reasonPlaceholder", { action: t(action === "deactivate" ? "operator.families.deactivate" : "operator.families.reactivate").toLowerCase() })}
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
            ? t("operator.families.saving")
            : action === "deactivate"
              ? t("operator.families.deactivateAccount")
              : t("operator.families.reactivateAccount")}
        </NButton>
      </div>
    </NForm>
  );
}

export function DeleteFamilyDialogContent({
  family,
}: Readonly<{ family: FamilyRecord }>) {
  const { t } = useKafilLanguage();
  const { pop } = useDialog();
  const { remove } = useFamilyCommands();

  async function handleDelete() {
    await remove.mutateAsync(family.id);
    await pop();
  }

  return (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-muted-foreground">
        {t("operator.families.deleteWarning")}
      </p>
      <div className="flex justify-end pt-5">
        <NButton
          type="button"
          variant="destructive"
          disabled={remove.isPending}
          onClick={() => void handleDelete()}
        >
          {remove.isPending ? t("operator.families.deleting") : t("operator.families.deleteAccount")}
        </NButton>
      </div>
    </div>
  );
}
