"use client";

import { UserRoundPlus } from "lucide-react";
import { FormInput, NFormSectionHeader } from "najm-kit";
import { useWatch } from "react-hook-form";

import { useTranslation } from "najm-i18n/react";
import { familyRelationshipItems } from "../../config/relationshipOptions";

export function FamilyGuardianFields({
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
  const { t } = useTranslation();
  const relationship = useWatch({ name: "relationshipToChildren" }) as
    | string
    | undefined;
  const relationshipItems = familyRelationshipItems(relationship, t);

  return (
    <div className="space-y-4">
      {showSectionHeader ? (
        <NFormSectionHeader
          icon={UserRoundPlus}
          title={t("operator.families.guardianStep")}
        />
      ) : null}
      <div className="space-y-2">
        <FormInput
          name="image"
          type="image"
          formLabel={t("operator.families.imageUrl")}
          subtitle={t("operator.families.imageUploadGuidance")}
          accept="image/avif,image/jpeg,image/png,image/webp"
          allowClear
          disabled={disabled}
          imageSize="md"
          imageVersion={imageVersion}
          previewClassName="h-48 w-full overflow-hidden rounded-xl"
          value={image}
          onChange={onImageChange}
        />
        {imageError ? (
          <p className="text-xs text-destructive">{imageError}</p>
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
          type="select"
          formLabel={t("operator.families.relationship")}
          placeholder={t("operator.families.chooseRelationship")}
          items={relationshipItems}
          icon="HeartHandshake"
        />
        <FormInput
          name="phone"
          type="phone"
          formLabel={t("operator.families.householdPhone")}
          placeholder={t("operator.families.phoneExample")}
          defaultCountry="ma"
          icon="Phone"
          required
        />
      </div>
    </div>
  );
}
