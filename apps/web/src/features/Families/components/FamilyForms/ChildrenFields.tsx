"use client";

import { Baby } from "lucide-react";
import { DynamicArray, FormInput, NFormSectionHeader } from "najm-kit";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";

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

export function FamilyChildrenFields({
  showSectionHeader = true,
}: Readonly<{ showSectionHeader?: boolean }>) {
  const { t } = useKafilLanguage();

  return (
    <div className="space-y-4">
      {showSectionHeader ? (
        <NFormSectionHeader
          icon={Baby}
          title={t("operator.families.initialChildrenStep")}
        />
      ) : null}
      <DynamicArray
        name="initialChildren"
        title={t("operator.families.child")}
        addLabel={t("operator.families.addChild")}
        emptyLabel={t("operator.families.childrenCanBeAddedLater")}
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
    </div>
  );
}
