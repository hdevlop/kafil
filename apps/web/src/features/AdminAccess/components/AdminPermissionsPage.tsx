"use client";

import { useMemo } from "react";
import { KeyRound } from "lucide-react";
import { NPageHeader, NPageLayout, NTable, type NTableProps, useDialog } from "najm-kit";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import { useDesktopTableMode } from "@/hooks/useDesktopTableMode";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { PageEmptyState, PageErrorState } from "@/shared/PageState";

import { useAccessPermissions } from "../hooks/useAdminAccess";
import { useAdminPermissionsTableFilters } from "../hooks/useAdminPermissionsTableFilters";
import type { AccessPermissionView } from "../types";
import { CreateAccessPermissionDialogContent } from "./AdminAccessCreateDialogs";
import { AdminPermissionCard } from "./AdminAccessCards";

export function AdminPermissionsPage() {
  const { t } = useKafilLanguage();
  const dialog = useDialog();
  const tableMode = useDesktopTableMode();
  const permissions = useAccessPermissions();
  const rows = permissions.data ?? [];
  const filters = useAdminPermissionsTableFilters(rows);
  const columns = useMemo<NTableProps<AccessPermissionView>["columns"]>(
    () => [
      { accessorKey: "resource", header: t("adminAccess.permissions.resource") },
      { accessorKey: "action", header: t("adminAccess.permissions.action") },
      { accessorKey: "name", header: t("adminAccess.permissions.permission") },
      {
        id: "roles",
        header: t("adminAccess.permissions.liveRoles"),
        cell: ({ row }) =>
          row.original.roles.map((role) => role.name).join(", ") || t("adminAccess.common.none"),
      },
      {
        accessorKey: "drift",
        header: t("adminAccess.permissions.canonicalState"),
        cell: ({ getValue }) => {
          const drift = getValue<AccessPermissionView["drift"]>();
          return drift === "in_sync"
            ? t("adminAccess.common.inSync")
            : drift === "custom"
              ? t("adminAccess.permissions.custom")
            : drift === "missing_live_grant"
              ? t("adminAccess.permissions.missingLiveGrant")
              : t("adminAccess.permissions.unexpectedLiveGrant");
        },
      },
    ],
    [t],
  );

  function create() {
    void dialog
      .openDialog({
        title: t("adminAccess.permissions.createTitle"),
        description: t("adminAccess.permissions.createDescription"),
        children: <CreateAccessPermissionDialogContent />,
        showButtons: false,
        size: "lg",
        height: "auto",
      })
      .then(() => permissions.refetch());
  }

  return (
    <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
      <NPageHeader
        icon={KeyRound}
        title={t("adminAccess.permissions.title")}
        subtitle={t("adminAccess.permissions.subtitle")}
        actions={<PageHeaderGlobalActions />}
      />
      <div className="min-h-0 flex-1">
        <NTable
          data={rows}
          columns={columns}
          filters={filters}
          onCreate={create}
          loading={permissions.isPending}
          error={permissions.error}
          getRowId={(permission) => permission.id}
          renderCard={AdminPermissionCard}
          renderEmpty={() => (
            <PageEmptyState
              icon={KeyRound}
              title={t("adminAccess.permissions.emptyTitle")}
              description={t("adminAccess.permissions.emptyDescription")}
            />
          )}
          renderError={(error) => (
            <PageErrorState
              error={error}
              onRetry={() => void permissions.refetch()}
            />
          )}
          availableModes={["cards", "table"]}
          mode={tableMode}
          responsiveSkeleton
          defaultMode="table"
          responsiveCards={false}
          showColumnVisibility={false}
          showViewToggle={false}
          classNames={{ pagination: "hidden lg:flex" }}
          addButtonText={t("adminAccess.permissions.create")}
          noDataText={t("adminAccess.permissions.noData")}
          loadingText={t("adminAccess.permissions.loading")}
          dynamicHeight
        />
      </div>
    </NPageLayout>
  );
}
