"use client";

import { KeyRound, UserRoundPlus } from "lucide-react";
import {
  buttonVariants,
  FormInput,
  NButton,
  NForm,
  NFormSectionHeader,
  useDialog,
} from "najm-kit";
import Link from "next/link";
import { useState } from "react";

import { useTranslation } from "najm-i18n/react";
import { CreateFamilyDialogContent } from "@/features/Families/components/FamilyForms";
import { CreateSponsorDialogContent } from "@/features/Sponsors/components/SponsorForms";

import {
  createAccessPermissionSchema,
  type CreateAccessPermissionValues,
  toCreateAccessPermissionInput,
} from "../config/adminAccessSchemas";
import { useAdminAccessCreateCommands } from "../hooks/useAdminAccess";

type AccountKind = "family" | "staff" | "sponsor";

export function CreateAccessUserDialogContent() {
  const { t } = useTranslation();
  const [kind, setKind] = useState<AccountKind | null>(null);

  if (kind === "family") return <CreateFamilyDialogContent />;
  if (kind === "sponsor") return <CreateSponsorDialogContent />;
  if (kind === "staff") return <StaffRedirectCard />;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {(["staff", "family", "sponsor"] as const).map((accountKind) => (
        <NButton
          key={accountKind}
          variant="outline"
          className="h-auto min-h-24 flex-col gap-2 py-4"
          onClick={() => setKind(accountKind)}
        >
          <UserRoundPlus className="h-5 w-5" />
          {t(`adminAccess.users.${accountKind}`)}
        </NButton>
      ))}
    </div>
  );
}

function StaffRedirectCard() {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-muted-foreground">
        {t("adminAccess.users.staffRedirectDescription")}
      </p>
      <div className="flex justify-end">
        <Link className={buttonVariants()} href="/staff">
          {t("adminAccess.users.openStaff")}
        </Link>
      </div>
    </div>
  );
}

export function CreateAccessPermissionDialogContent() {
  const { t } = useTranslation();
  const { pop } = useDialog();
  const { createPermission } = useAdminAccessCreateCommands();

  async function submit(values: CreateAccessPermissionValues) {
    await createPermission.mutateAsync(toCreateAccessPermissionInput(values));
    await pop();
  }

  return (
    <NForm
      id="create-access-permission-form"
      defaultValues={{
        action: "",
        description: "",
        resource: "",
        roles: ["admin"],
      }}
      schema={createAccessPermissionSchema}
      onSubmit={submit}
    >
      <NFormSectionHeader
        icon={KeyRound}
        title={t("adminAccess.permissions.create")}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <FormInput
          name="resource"
          type="text"
          formLabel={t("adminAccess.permissions.resource")}
          placeholder={t("adminAccess.permissions.resourcePlaceholder")}
          required
        />
        <FormInput
          name="action"
          type="text"
          formLabel={t("adminAccess.permissions.action")}
          placeholder={t("adminAccess.permissions.actionPlaceholder")}
          required
        />
        <div className="md:col-span-2">
          <FormInput
            name="roles"
            type="multiselect"
            formLabel={t("adminAccess.permissions.liveRoles")}
            items={[
              { value: "admin", label: t("adminAccess.users.admin") },
              { value: "operator", label: t("adminAccess.users.operator") },
              { value: "family", label: t("adminAccess.users.family") },
              { value: "sponsor", label: t("adminAccess.users.sponsor") },
            ]}
          />
        </div>
        <div className="md:col-span-2">
          <FormInput
            name="description"
            type="textarea"
            formLabel={t("adminAccess.permissions.description")}
            placeholder={t("adminAccess.permissions.descriptionPlaceholder")}
          />
        </div>
      </div>
      <div className="flex justify-end pt-5">
        <NButton type="submit" disabled={createPermission.isPending}>
          {createPermission.isPending
            ? t("adminAccess.permissions.creating")
            : t("adminAccess.permissions.create")}
        </NButton>
      </div>
    </NForm>
  );
}