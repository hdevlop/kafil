"use client";

import { z } from "zod";
import {
  NBadge,
  FormInput,
  NButton,
  NCard,
  NDetailList,
  NForm,
  useDialog,
  useNajmFormat,
} from "najm-kit";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import { PageErrorState } from "@/shared/PageState";

import { useAccessUser, useAccessUserCommands } from "../hooks/useAdminAccess";
import type { AccessUser } from "../types";

const reasonSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export function AdminAccessUserDetails({
  userId,
}: Readonly<{ userId: string }>) {
  const { t } = useKafilLanguage();
  const fmt = useNajmFormat();
  const user = useAccessUser(userId);
  if (user.isPending) return <NCard title={t("adminAccess.dialogs.loadingAccount")} loading />;
  if (user.isError) return <PageErrorState error={user.error} />;
  if (!user.data) return null;
  const data = user.data;
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 rounded-xl bg-muted/60 p-4">
        <div>
          <p className="font-semibold">{data.name || data.email}</p>
          <p className="text-sm text-muted-foreground">{data.email}</p>
        </div>
        <NBadge status={data.status} />
      </div>
      <NDetailList
        items={[
          { label: t("adminAccess.users.role"), value: data.role || t("adminAccess.common.noRole") },
          { label: t("adminAccess.dialogs.emailVerified"), value: data.emailVerified ? t("adminAccess.common.yes") : t("adminAccess.common.no") },
          { label: t("adminAccess.users.lastLogin"), value: fmt.date(data.lastLogin) },
          {
            label: t("adminAccess.dialogs.linkedProfile"),
            value:
              data.familyProfileId ||
              data.staffProfileId ||
              data.sponsorProfileId ||
              t("adminAccess.common.bootstrapAccount"),
          },
        ]}
      />
      <NCard
        title={t("adminAccess.dialogs.effectivePermissions")}
        description={t("adminAccess.dialogs.effectivePermissionsDescription")}
      >
        <div className="flex flex-wrap gap-2">
          {data.effectivePermissions.map((permission) => (
            <span
              className="rounded-full bg-muted px-3 py-1 text-xs"
              key={permission.id}
            >
              {permission.name}
            </span>
          ))}
        </div>
      </NCard>
    </div>
  );
}

export function AdminAccessReasonDialog({
  action,
  user,
}: Readonly<{
  action: "deactivate" | "reactivate";
  user: AccessUser;
}>) {
  const { t } = useKafilLanguage();
  const { pop } = useDialog();
  const commands = useAccessUserCommands();
  const command = commands[action];

  async function submit(values: z.infer<typeof reasonSchema>) {
    await command.mutateAsync({ userId: user.id, reason: values.reason });
    await pop();
  }

  return (
    <NForm
      id={`${action}-access-user`}
      schema={reasonSchema}
      defaultValues={{ reason: "" }}
      onSubmit={submit}
      className="space-y-5"
    >
      <p className="text-sm text-muted-foreground">
        {action === "deactivate"
          ? t("adminAccess.dialogs.deactivateDescription")
          : t("adminAccess.dialogs.reactivateDescription")}
      </p>
      <FormInput
        name="reason"
        type="textarea"
        formLabel={t("adminAccess.dialogs.reason")}
        icon="MessageSquareText"
        required
      />
      <div className="flex justify-end">
        <NButton
          type="submit"
          variant={action === "deactivate" ? "destructive" : "default"}
          disabled={command.isPending}
        >
          {command.isPending
            ? t("adminAccess.dialogs.saving")
            : action === "deactivate"
              ? t("adminAccess.dialogs.deactivateTitle")
              : t("adminAccess.dialogs.reactivateTitle")}
        </NButton>
      </div>
    </NForm>
  );
}

export function RevokeSessionsDialog({
  user,
}: Readonly<{ user: AccessUser }>) {
  const { t } = useKafilLanguage();
  const { pop } = useDialog();
  const { revokeSessions } = useAccessUserCommands();
  async function revoke() {
    await revokeSessions.mutateAsync(user.id);
    await pop();
  }
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        {t("adminAccess.dialogs.revokeDescription", {
          name: user.name || user.email,
        })}
      </p>
      <div className="flex justify-end">
        <NButton
          variant="destructive"
          disabled={revokeSessions.isPending}
          onClick={() => void revoke()}
        >
          {t("adminAccess.dialogs.revokeTitle")}
        </NButton>
      </div>
    </div>
  );
}
