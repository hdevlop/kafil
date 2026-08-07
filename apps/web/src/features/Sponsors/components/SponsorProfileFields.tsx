"use client";

import { FormInput } from "najm-kit";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";

export const SPONSOR_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
export const MAX_SPONSOR_IMAGE_SIZE = 5_000_000;

const SPONSOR_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function getSponsorImageError(file: File) {
  if (!SPONSOR_IMAGE_TYPES.has(file.type)) {
    return "Select a PNG, JPEG, or WebP image.";
  }
  if (file.size > MAX_SPONSOR_IMAGE_SIZE) {
    return "Image must be 5 MB or smaller.";
  }
  return null;
}

export function SponsorDemographicFields({
  includeNotes = false,
  required = false,
}: Readonly<{
  includeNotes?: boolean;
  required?: boolean;
}>) {
  const { t } = useKafilLanguage();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <FormInput
        name="gender"
        type="select"
        formLabel={t("operator.sponsors.gender")}
        items={[
          { value: "F", label: t("operator.sponsors.female") },
          { value: "M", label: t("operator.sponsors.male") },
        ]}
        icon="Users"
        required={required}
      />
      <FormInput
        name="dateOfBirth"
        type="date"
        formLabel={t("operator.sponsors.dateOfBirth")}
        placeholder={t("operator.sponsors.datePlaceholder")}
        icon="Calendar"
        required={required}
      />
      <FormInput
        name="address"
        type="textarea"
        formLabel={t("operator.sponsors.address")}
        placeholder={t("operator.sponsors.addressPlaceholder")}
        icon="MapPin"
        required={required}
      />
      {includeNotes ? (
        <FormInput
          name="notes"
          type="textarea"
          formLabel={t("operator.sponsors.operatorNotes")}
          placeholder={t("operator.sponsors.notesPlaceholder")}
          icon="NotebookPen"
        />
      ) : null}
    </div>
  );
}
