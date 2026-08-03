"use client";

import { useEffect, useState } from "react";
import type { StepConfig } from "najm-kit";
import { NajmScroll, useDialog, WizardForm } from "najm-kit";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { useFormFillEnabled } from "@/lib/devFormFill";
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
import { createFamilyDefaultValues, createFamilyDevFillValues, familyImageError } from "./helpers";

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
  const formFillEnabled = useFormFillEnabled();
  const isSubmitting = create.isPending || isUploadingImage;

  useEffect(() => {
    if (!formFillEnabled) return;

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
  }, [formFillEnabled]);

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
      await create.mutateAsync({
        ...toCreateFamilyInput(values),
        image: uploadedImagePath,
      });
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
    <div className="h-full min-h-0" aria-busy={isSubmitting}>
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
          step: "min-h-0 flex-1 overflow-y-hidden pb-4",
          footer: "sticky bottom-0 z-10 bg-transparent pt-3",
        }}
      />
    </div>
  );
}
