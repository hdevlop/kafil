"use client";

import { KeyRound, Mail } from "lucide-react";
import { useMemo, useState } from "react";
import type { StepConfig } from "najm-kit";
import {
  NButton,
  NCredentialsCard,
  NajmScroll,
  useDialog,
  WizardForm,
} from "najm-kit";

import { useTranslation } from "najm-i18n/react";
import {
  deleteFamilyImage,
  uploadFamilyImage,
} from "@/services/familyApi";

import {
  createFamilyChildrenStepSchema,
  createFamilyFormSchema,
  createFamilyGuardianStepSchema,
  createFamilyHouseholdStepSchema,
  toCreateFamilyInput,
  type CreateFamilyFormValues,
} from "../../config/familySchemas";
import { useFamilyCommands } from "../../hooks/useFamilies";
import { FamilyChildrenFields } from "./ChildrenFields";
import { FamilyGuardianFields } from "./GuardianFields";
import { FamilyHouseholdFields } from "./HouseholdFields";
import { createFamilyDefaultValues, familyImageError } from "./helpers";

export function CreateFamilyDialogContent() {
  const { t } = useTranslation();
  const { pop } = useDialog();
  const { create } = useFamilyCommands();
  const [familyImage, setFamilyImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [credentials, setCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const wizardDefaultValues = useMemo(() => createFamilyDefaultValues(), []);
  const isSubmitting = create.isPending || isUploadingImage;

  const steps: StepConfig[] = [
    {
      id: "guardian",
      title: t("operator.families.guardianStep"),
      description: "",
      fields: [
        "name",
        "guardianCin",
        "email",
        "guardianDateOfBirth",
        "relationshipToChildren",
        "phone",
      ],
      schema: createFamilyGuardianStepSchema,
      render: () => (
        <FamilyGuardianFields
          disabled={isSubmitting}
          image={familyImage}
          imageError={imageError}
          onImageChange={selectFamilyImage}
          showSectionHeader={false}
        />
      ),
    },
    {
      id: "household",
      title: t("operator.families.householdStep"),
      description: t("operator.families.householdStepDescription"),
      fields: [
        "housingSituation",
        "registrationDate",
        "supportPriority",
        "activationTargetMad",
        "notes",
        "exactAddress",
      ],
      schema: createFamilyHouseholdStepSchema,
      render: () => (
        <FamilyHouseholdFields disabled={isSubmitting} showSectionHeader={false} />
      ),
    },
    {
      id: "initial-children",
      title: t("operator.families.initialChildrenStep"),
      description: t("operator.families.initialChildrenStepDescription"),
      fields: ["initialChildren"],
      schema: createFamilyChildrenStepSchema,
      render: () => (
        <NajmScroll axis="y" className="min-h-0 flex-1">
          <FamilyChildrenFields showSectionHeader={false} />
        </NajmScroll>
      ),
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
    if (imageError) throw new Error(imageError);

    let uploadedImagePath: string | null = null;
    setIsUploadingImage(Boolean(familyImage));

    try {
      uploadedImagePath = familyImage
        ? await uploadFamilyImage(familyImage)
        : null;
      const result = await create.mutateAsync({
        ...toCreateFamilyInput(values),
        image: uploadedImagePath,
      });
      setCredentials({ email: values.email.trim(), password: result.initialPassword });
    } catch (error) {
      if (uploadedImagePath) {
        await deleteFamilyImage(uploadedImagePath).catch(() => undefined);
      }
      throw error;
    } finally {
      setIsUploadingImage(false);
    }
  }

  if (credentials) {
    return (
      <NCredentialsCard
        title={t("operator.staff.accessCreated")}
        description={t("operator.staff.accessOneTimeHint")}
        fields={[
          { label: t("operator.families.email"), value: credentials.email, icon: Mail },
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
    <div className="h-full min-h-0" aria-busy={isSubmitting}>
      <WizardForm
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
          step: "min-h-0 flex-1 overflow-y-hidden pb-4",
          footer: "sticky bottom-0 z-10 bg-transparent pt-3",
        }}
      />
    </div>
  );
}
