"use client";

import { Baby } from "lucide-react";
import {
  FormInput,
  NButton,
  NForm,
  NFormSectionHeader,
  useDialog,
} from "najm-kit";

import { devFormTools } from "@/lib/devFormFill";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";

import {
  childStatusFormSchema,
  createChildFormSchema,
  toCreateChildInput,
  toUpdateChildInput,
  updateChildFormSchema,
  type ChildStatusFormValues,
  type CreateChildFormValues,
  type UpdateChildFormValues,
} from "../config/childSchemas";
import { useChildCommands, useChildFamilies } from "../hooks/useChildren";
import type { ChildRecord } from "../types";

function ChildFields() {
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
          formLabel={t("operator.children.operatorNotes")}
          placeholder={t("operator.children.optionalNotes")}
          icon="NotebookPen"
        />
      </div>
    </div>
  );
}

export function CreateChildDialogContent() {
  const { t } = useKafilLanguage();
  const { pop } = useDialog();
  const { create } = useChildCommands();
  const families = useChildFamilies();
  const familyOptions =
    families.data?.map((family) => ({
      value: family.id,
      label: `${family.name} \u2014 ${family.exactAddress}`,
    })) ?? [];

  async function handleSubmit(values: CreateChildFormValues) {
    await create.mutateAsync(toCreateChildInput(values));
    await pop();
  }

  return (
    <NForm
      id="create-child-form"
      schema={createChildFormSchema}
      defaultValues={{
        familyProfileId: "",
        legalName: "",
        dateOfBirth: "",
        gender: "F",
        schoolLevel: "",
        clothingSize: "",
        shoeSize: "",
        notes: "",
      }}
      onSubmit={handleSubmit}
      devTools={devFormTools(createChildFormSchema, {
        familyProfileId: familyOptions,
      })}
    >
      <NFormSectionHeader icon={Baby} title={t("operator.children.record")} />
      <FormInput
        name="familyProfileId"
        type="combobox"
        formLabel={t("operator.families.profile")}
        placeholder={
          families.isPending ? t("operator.families.loading") : t("operator.children.chooseFamily")
        }
        searchPlaceholder={t("operator.children.searchFamilies")}
        emptyMessage={t("operator.children.noFamily")}
        items={familyOptions}
        icon="Search"
        disabled={families.isPending}
        required
      />
      <ChildFields />

      <div className="flex justify-end pt-5">
        <NButton type="submit" disabled={create.isPending}>
          {create.isPending ? t("operator.children.creating") : t("operator.children.create")}
        </NButton>
      </div>
    </NForm>
  );
}

export function UpdateChildDialogContent({
  child,
}: Readonly<{ child: ChildRecord }>) {
  const { pop } = useDialog();
  const { update } = useChildCommands();

  async function handleSubmit(values: UpdateChildFormValues) {
    await update.mutateAsync({ id: child.id, input: toUpdateChildInput(values) });
    await pop();
  }

  return (
    <NForm
      id="update-child-form"
      schema={updateChildFormSchema}
      defaultValues={{
        legalName: child.legalName,
        dateOfBirth: child.dateOfBirth,
        gender: child.gender === "M" ? "M" : "F",
        schoolLevel: child.schoolLevel ?? "",
        clothingSize: child.clothingSize ?? "",
        shoeSize: child.shoeSize ?? "",
        notes: child.notes ?? "",
      }}
      onSubmit={handleSubmit}
      devTools={devFormTools(updateChildFormSchema)}
    >
      <NFormSectionHeader icon={Baby} title="Child profile" />
      <ChildFields />
      <div className="flex justify-end pt-5">
        <NButton type="submit" disabled={update.isPending}>
          {update.isPending ? "Saving..." : "Save child record"}
        </NButton>
      </div>
    </NForm>
  );
}

export function ChildStatusDialogContent({
  action,
  child,
}: Readonly<{
  action: "deactivate" | "reactivate";
  child: ChildRecord;
}>) {
  const { pop } = useDialog();
  const commands = useChildCommands();
  const command = commands[action];

  async function handleSubmit(values: ChildStatusFormValues) {
    await command.mutateAsync({ id: child.id, reason: values.reason });
    await pop();
  }

  return (
    <NForm
      id="child-status-form"
      schema={childStatusFormSchema}
      defaultValues={{ reason: "" }}
      onSubmit={handleSubmit}
      devTools={devFormTools(childStatusFormSchema)}
      className="space-y-5"
    >
      <p className="text-sm leading-6 text-muted-foreground">
        This preserves child history and records the operator reason in the audit log.
      </p>
      <FormInput
        name="reason"
        type="textarea"
        formLabel="Reason"
        placeholder={`Why should this child be ${action}d?`}
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
            ? "Saving..."
            : action === "deactivate"
              ? "Deactivate child"
              : "Reactivate child"}
        </NButton>
      </div>
    </NForm>
  );
}

export function DeleteChildDialogContent({
  child,
}: Readonly<{ child: ChildRecord }>) {
  const { pop } = useDialog();
  const { remove } = useChildCommands();

  async function handleDelete() {
    await remove.mutateAsync(child.id);
    await pop();
  }

  return (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-muted-foreground">
        This permanently deletes the child record. It cannot be undone, and it
        is unavailable while support history still references this child.
      </p>
      <div className="flex justify-end pt-5">
        <NButton
          type="button"
          variant="destructive"
          disabled={remove.isPending}
          onClick={() => void handleDelete()}
        >
          {remove.isPending ? "Deleting..." : "Permanently delete child"}
        </NButton>
      </div>
    </div>
  );
}
