"use client";

import { useRef, useState } from "react";
import type { StepConfig } from "najm-kit";
import { useDialog, WizardForm } from "najm-kit";

import { useTranslation } from "najm-i18n/react";
import { minorUnitsToMadInput } from "@/features/Budgets/config/budgetSchemas";
import {
  deleteFamilyImage,
  uploadFamilyImage,
} from "@/services/familyApi";

import {
  createFamilyGuardianStepSchema,
  toUpdateFamilyInput,
  updateFamilyFormSchema,
  updateFamilyHouseholdStepSchema,
  type UpdateFamilyFormValues,
} from "../../config/familySchemas";
import { useFamilyCommands } from "../../hooks/useFamilies";
import type { FamilyRecord } from "../../types";
import { FamilyGuardianFields } from "./GuardianFields";
import { FamilyHouseholdFields } from "./HouseholdFields";
import { familyImageError } from "./helpers";

export function UpdateFamilyDialogContent({
  family,
}: Readonly<{ family: FamilyRecord }>) {
  const { t } = useTranslation();
  const { pop } = useDialog();
  const { update } = useFamilyCommands();
  const [familyImage, setFamilyImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [removeFamilyImage, setRemoveFamilyImage] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const submittingRef = useRef(false);
  const isSubmitting = update.isPending || isUploadingImage;

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
    if (imageError) throw new Error(imageError);
    if (submittingRef.current) return;
    submittingRef.current = true;

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
      submittingRef.current = false;
    }
  }

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
          image={removeFamilyImage ? null : familyImage ?? family.image}
          imageError={imageError}
          imageVersion={family.updatedAt}
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
        "deliveryLocation",
      ],
      schema: updateFamilyHouseholdStepSchema,
      render: () => (
        <FamilyHouseholdFields
          disabled={isSubmitting}
          showSectionHeader={false}
          showPolicyFields={false}
        />
      ),
    },
  ];

  return (
    <div className="h-full min-h-0" aria-busy={isSubmitting}>
      <WizardForm
        steps={steps}
        schema={updateFamilyFormSchema}
        defaultValues={{
          name: family.name,
          email: family.email,
          guardianCin: family.guardianCin ?? "",
          guardianDateOfBirth: family.guardianDateOfBirth ?? "",
          relationshipToChildren: family.relationshipToChildren ?? "",
          phone: family.phone ?? "",
          housingSituation: family.housingSituation,
          registrationDate: family.registrationDate,
          supportPriority: family.supportPriority,
          activationTargetMad: family.funding
            ? minorUnitsToMadInput(family.funding.targetMinor)
            : "",
          notes: family.notes ?? "",
          deliveryLocation: {
            address: family.exactAddress,
            latitude: family.deliveryLatitude,
            longitude: family.deliveryLongitude,
          },
        }}
        onSubmit={handleSubmit}
        nextLabel={t("operator.families.next")}
        previousLabel={t("operator.families.previous")}
        submitLabel={
          isSubmitting
            ? t("operator.families.saving")
            : t("operator.families.saveProfile")
        }
        className={isSubmitting ? "pointer-events-none select-none" : undefined}
        classNames={{
          root: "h-full min-h-0",
          step: "min-h-0 flex-1 pb-4",
        }}
        devTools={{
          overrides: {
            housingSituation: ["owned", "rented", "hosted", "temporary"],
          },
        }}
      />
    </div>
  );
}
