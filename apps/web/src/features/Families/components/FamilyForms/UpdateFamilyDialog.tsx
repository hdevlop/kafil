"use client";

import { useState } from "react";
import { NButton, NForm, useDialog } from "najm-kit";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import { minorUnitsToMadInput } from "@/features/Budgets/config/budgetSchemas";
import {
  deleteFamilyImage,
  uploadFamilyImage,
} from "@/services/familyApi";

import {
  toUpdateFamilyInput,
  updateFamilyFormSchema,
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
    if (imageError) throw new Error(imageError);

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
        relationshipToChildren: family.relationshipToChildren ?? "",
        phone: family.phone ?? "",
        housingSituation: family.housingSituation,
        registrationDate: family.registrationDate,
        supportPriority: family.supportPriority,
        activationTargetMad: family.funding
          ? minorUnitsToMadInput(family.funding.targetMinor)
          : "",
        notes: family.notes ?? "",
        exactAddress: family.exactAddress,
      }}
      onSubmit={handleSubmit}
      devTools={{
        overrides: {
          housingSituation: ["owned", "rented", "hosted", "temporary"],
        },
      }}
    >
      <FamilyGuardianFields
        disabled={update.isPending || isUploadingImage}
        image={removeFamilyImage ? null : familyImage ?? family.image}
        imageError={imageError}
        imageVersion={family.updatedAt}
        onImageChange={selectFamilyImage}
      />
      <FamilyHouseholdFields
        disabled={update.isPending || isUploadingImage}
      />
      <div className="flex justify-end pt-1">
        <NButton type="submit" disabled={update.isPending || isUploadingImage}>
          {update.isPending || isUploadingImage
            ? t("operator.families.saving")
            : t("operator.families.saveProfile")}
        </NButton>
      </div>
    </NForm>
  );
}
