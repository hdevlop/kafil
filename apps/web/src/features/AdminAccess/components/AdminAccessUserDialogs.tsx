"use client";

import { useState } from "react";
import { z } from "zod";
import {
  NAlert,
  NBadge,
  FormInput,
  NButton,
  NCard,
  NDetailList,
  NErrorState,
  NForm,
  useDialog,
  useNajmFormat,
} from "najm-kit";

import { useTranslation } from "najm-i18n/react";
import { getPublicApiErrorMessage } from "@/services/apiError";

import { useAccessUser, useAccessUserCommands } from "../hooks/useAdminAccess";
import { expectedResetMode } from "../lib/accessReset";
import type { AccessUser } from "../types";

const reasonSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export function AdminAccessUserDetails({
  userId,
}: Readonly<{ userId: string }>) {
  const { t } = useTranslation();
  const fmt = useNajmFormat();
  const user = useAccessUser(userId);
  if (user.isPending) return <NCard title={t("adminAccess.dialogs.loadingAccount")} loading />;
  if (user.isError) {
    return (
      <NErrorState
        message={getPublicApiErrorMessage(user.error, t("state.retry"))}
        surface="panel"
      />
    );
  }
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
  const { t } = useTranslation();
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

/**
 * The one confirmation for all three recovery workflows.
 *
 * The copy names the consequence for this specific account before the
 * administrator commits to it, because "reset access" means three different
 * things depending on who the account belongs to. It never renders the
 * guardian identity number, a password, a token, or a link — the server does
 * not return any of them, and this dialog asks for none.
 */
export function AdminAccessResetDialog({
  user,
}: Readonly<{ user: AccessUser }>) {
  const { t } = useTranslation();
  const { pop } = useDialog();
  const { resetAccess } = useAccessUserCommands();
  const [undelivered, setUndelivered] = useState(false);
  const expected = expectedResetMode(user);

  async function submit(values: z.infer<typeof reasonSchema>) {
    setUndelivered(false);
    const result = await resetAccess.mutateAsync({
      userId: user.id,
      reason: values.reason,
    });
    // The account changed either way, and the list has been invalidated. What
    // is still unresolved is the message, so the dialog stays open and says so
    // rather than closing on a success the recipient never received.
    if (result.delivery === "not_sent") {
      setUndelivered(true);
      return;
    }
    await pop();
  }

  return (
    <NForm
      id="reset-access-user"
      schema={reasonSchema}
      defaultValues={{ reason: "" }}
      onSubmit={submit}
      className="space-y-5"
    >
      <div className="rounded-xl bg-muted/60 p-4">
        <p className="font-semibold">{user.name || user.email}</p>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>
      <p className="text-sm text-muted-foreground">
        {t(`adminAccess.dialogs.reset.${expected}`)}
      </p>
      {undelivered ? (
        <NAlert
          description={t("adminAccess.dialogs.reset.notSent")}
          role="alert"
          tone="error"
        />
      ) : null}
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
          variant="destructive"
          disabled={resetAccess.isPending || expected === "unsupported"}
        >
          {resetAccess.isPending
            ? t("adminAccess.dialogs.saving")
            : t("adminAccess.dialogs.resetConfirm")}
        </NButton>
      </div>
    </NForm>
  );
}

export function RevokeSessionsDialog({
  user,
}: Readonly<{ user: AccessUser }>) {
  const { t } = useTranslation();
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
