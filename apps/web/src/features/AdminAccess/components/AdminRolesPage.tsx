"use client";

import { ShieldCheck } from "lucide-react";
import { NPageHeader, NCard, NPageLayout } from "najm-kit";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { PageEmptyState, PageErrorState } from "@/shared/PageState";

import { useAccessRoles } from "../hooks/useAdminAccess";

export function AdminRolesPage() {
  const { t } = useKafilLanguage();
  const roles = useAccessRoles();
  return (
    <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
      <NPageHeader
        icon={ShieldCheck}
        title={t("adminAccess.roles.title")}
        subtitle={t("adminAccess.roles.subtitle")}
        actions={<PageHeaderGlobalActions />}
      />
      {roles.isPending ? (
        <NCard title={t("adminAccess.roles.loading")} loading />
      ) : roles.isError ? (
        <PageErrorState error={roles.error} onRetry={() => void roles.refetch()} />
      ) : roles.data?.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {roles.data.map((role) => (
            <NCard
              key={role.id}
              title={role.name}
              description={role.description || t("adminAccess.roles.fallbackDescription")}
            >
              <div className="mb-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-muted px-3 py-1">
                  {t("adminAccess.roles.users", { count: role.userCount })}
                </span>
                <span className="rounded-full bg-muted px-3 py-1">
                  {t("adminAccess.roles.permissions", { count: role.permissionCount })}
                </span>
                <span className="rounded-full bg-muted px-3 py-1">
                  {t("adminAccess.common.codeManaged")}
                </span>
                <span
                  className={`rounded-full px-3 py-1 ${
                    role.inSync
                      ? "bg-emerald-500/10 text-emerald-700"
                      : "bg-amber-500/10 text-amber-700"
                  }`}
                >
                  {role.inSync ? t("adminAccess.common.inSync") : t("adminAccess.common.grantDrift")}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {role.permissions?.map((permission) => (
                  <span
                    className="rounded-md border border-border px-2 py-1 text-xs"
                    key={permission.id}
                  >
                    {permission.name}
                  </span>
                ))}
              </div>
            </NCard>
          ))}
        </div>
      ) : (
        <PageEmptyState
          icon={ShieldCheck}
          title={t("adminAccess.roles.emptyTitle")}
          description={t("adminAccess.roles.emptyDescription")}
        />
      )}
    </NPageLayout>
  );
}
