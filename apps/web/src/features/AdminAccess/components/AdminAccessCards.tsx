"use client";

import { BadgeCheck, CalendarDays, KeyRound, Shield, Users } from "lucide-react";
import { NBadge, NCard, NCardAction, NCardInfo, NCardSection } from "najm-kit";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { formatKafilDate } from "@/lib/format";
import { StatusBadge } from "@/shared/StatusBadge";

import type { AccessPermissionView, AccessUser } from "../types";

export function AdminUserCard({ data, onClick }: Readonly<{ data: AccessUser; onClick?: () => void }>) {
  const { t } = useKafilLanguage();

  return (
    <NCard
      embedded
      title={data.name || t("adminAccess.users.unnamed")}
      description={data.email}
      onClick={onClick}
      className={onClick ? "cursor-pointer" : undefined}
    >
      <NCardAction><StatusBadge status={data.status} /></NCardAction>
      <NCardSection density="responsive" surface="responsive">
        <NCardInfo icon={Shield} label={t("adminAccess.users.role")} value={data.role || t("adminAccess.common.noRole")} />
        <NCardInfo icon={BadgeCheck} label={t("adminAccess.users.verified")} value={data.emailVerified ? t("adminAccess.common.yes") : t("adminAccess.common.no")} />
        <NCardInfo icon={CalendarDays} label={t("adminAccess.users.lastLogin")} value={formatKafilDate(data.lastLogin)} />
      </NCardSection>
    </NCard>
  );
}

export function AdminPermissionCard({ data }: Readonly<{ data: AccessPermissionView }>) {
  const { t } = useKafilLanguage();
  const canonicalState = data.drift === "in_sync"
    ? t("adminAccess.common.inSync")
    : data.drift === "custom"
      ? t("adminAccess.permissions.custom")
      : data.drift === "missing_live_grant"
        ? t("adminAccess.permissions.missingLiveGrant")
        : t("adminAccess.permissions.unexpectedLiveGrant");

  return (
    <NCard embedded title={data.name} description={data.description || data.resource}>
      <NCardAction><NBadge>{canonicalState}</NBadge></NCardAction>
      <NCardSection density="responsive" surface="responsive">
        <NCardInfo icon={KeyRound} label={t("adminAccess.permissions.action")} value={data.action} />
        <NCardInfo icon={Shield} label={t("adminAccess.permissions.resource")} value={data.resource} />
        <NCardInfo icon={Users} label={t("adminAccess.permissions.liveRoles")} value={data.roles.map((role) => role.name).join(", ") || t("adminAccess.common.none")} />
      </NCardSection>
    </NCard>
  );
}
