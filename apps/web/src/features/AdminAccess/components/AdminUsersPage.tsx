"use client";

import { useMemo, useState } from "react";
import { Eye, KeyRound, UserCheck, UserRoundX, Users } from "lucide-react";
import { NPageHeader, NPageLayout, NTable, type NTableProps, useDialog } from "najm-kit";

import { createOffsetPagination, getPageIndex } from "@/lib/pagination";
import { createCardPagination } from "@/lib/tablePagination";
import { formatKafilDate } from "@/lib/format";
import { useDesktopTableMode } from "@/hooks/useDesktopTableMode";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { PageEmptyState, PageErrorState } from "@/shared/PageState";
import { StatusBadge } from "@/shared/StatusBadge";

import { useResponsiveAccessUsers } from "../hooks/useAdminAccess";
import { useAdminUsersTableFilters } from "../hooks/useAdminUsersTableFilters";
import type { AccessUser, AccessUserListQuery } from "../types";
import {
  AdminAccessReasonDialog,
  AdminAccessUserDetails,
  RevokeSessionsDialog,
} from "./AdminAccessUserDialogs";
import { CreateAccessUserDialogContent } from "./AdminAccessCreateDialogs";
import { AdminUserCard } from "./AdminAccessCards";

export function AdminUsersPage() {
  const dialog = useDialog();
  const { t } = useKafilLanguage();
  const tableMode = useDesktopTableMode();
  const [query, setQuery] = useState<AccessUserListQuery>(() => ({
    ...createOffsetPagination(0, 25),
  }));
  const users = useResponsiveAccessUsers(query);
  const filters = useAdminUsersTableFilters(query, setQuery);
  const rows = users.data;
  const pageIndex = getPageIndex(query);
  const pageCount = Math.max(
    1,
    Math.ceil(users.total / query.limit),
  );
  const columns = useMemo<NTableProps<AccessUser>["columns"]>(
    () => [
      { accessorKey: "name", header: t("adminAccess.users.user"), cell: ({ row }) => row.original.name || t("adminAccess.users.unnamed") },
      { accessorKey: "email", header: t("adminAccess.users.email") },
      { accessorKey: "role", header: t("adminAccess.users.role"), cell: ({ getValue }) => getValue<string | null>() || t("adminAccess.common.noRole") },
      { accessorKey: "status", header: t("adminAccess.users.status"), cell: ({ getValue }) => <StatusBadge status={getValue<string>()} /> },
      { accessorKey: "emailVerified", header: t("adminAccess.users.verified"), cell: ({ getValue }) => getValue<boolean>() ? t("adminAccess.common.yes") : t("adminAccess.common.no") },
      { accessorKey: "lastLogin", header: t("adminAccess.users.lastLogin"), cell: ({ getValue }) => formatKafilDate(getValue<string | null>()) },
    ],
    [t],
  );

  function view(user: AccessUser) {
    void dialog.openDialog({
      title: user.name || user.email,
      description: t("adminAccess.users.detailDescription"),
      children: <AdminAccessUserDetails userId={user.id} />,
      showButtons: false,
      size: "lg",
    });
  }

  function create() {
    void dialog
      .openDialog({
        title: t("adminAccess.users.createTitle"),
        description: t("adminAccess.users.createDescription"),
        children: <CreateAccessUserDialogContent />,
        showButtons: false,
        size: "xl",
        height: "auto",
      })
      .then(() => users.refetch());
  }

  function status(user: AccessUser) {
    const action = user.status === "inactive" ? "reactivate" : "deactivate";
    void dialog.openDialog({
      title: t(action === "deactivate" ? "adminAccess.dialogs.deactivateTitle" : "adminAccess.dialogs.reactivateTitle"),
      description: user.email,
      children: <AdminAccessReasonDialog action={action} user={user} />,
      showButtons: false,
      size: "sm",
    });
  }

  function revoke(user: AccessUser) {
    void dialog.openDialog({
      title: t("adminAccess.dialogs.revokeTitle"),
      description: user.email,
      children: <RevokeSessionsDialog user={user} />,
      showButtons: false,
      size: "sm",
    });
  }

  return (
    <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
      <NPageHeader
        icon={Users}
        title={t("adminAccess.users.title")}
        subtitle={t("adminAccess.users.subtitle")}
        actions={<PageHeaderGlobalActions />}
      />
      <div className="min-h-0 flex-1">
        <NTable
          className="admin-users-table"
          data={rows}
          columns={columns}
          filters={filters}
          onCreate={create}
          loading={users.isPending}
          error={users.error}
          getRowId={(user) => user.id}
          onView={view}
          renderCard={AdminUserCard}
          renderEmpty={() => (
            <PageEmptyState
              icon={Users}
              title={t("adminAccess.users.emptyTitle")}
              description={t("adminAccess.users.emptyDescription")}
            />
          )}
          renderError={(error) => (
            <PageErrorState
              error={error}
              onRetry={() => void users.refetch()}
            />
          )}
          menu={{
            row: (user) => [
              { label: t("adminAccess.users.view"), icon: Eye, onSelect: () => view(user) },
              {
                label:
                  user.status === "inactive"
                    ? t("adminAccess.users.reactivate")
                    : t("adminAccess.users.deactivate"),
                icon:
                  user.status === "inactive" ? UserCheck : UserRoundX,
                danger: user.status !== "inactive",
                disabled: user.role === "admin",
                separatorBefore: true,
                onSelect: () => status(user),
              },
              {
                label: t("adminAccess.users.revokeSessions"),
                icon: KeyRound,
                danger: true,
                disabled: user.role === "admin",
                onSelect: () => revoke(user),
              },
            ],
          }}
          menuButton
          addButtonText={t("adminAccess.users.create")}
          manualPagination
          pagination={{ pageIndex, pageSize: query.limit }}
          pageCount={pageCount}
          onPaginationChange={({ pageIndex: nextPage, pageSize }) =>
            setQuery({
              ...query,
              limit: pageSize,
              offset: nextPage * pageSize,
            })
          }
          cardPagination={createCardPagination(users, t)}
          pageSizeOptions={[10, 25, 50, 100]}
          availableModes={["cards", "table"]}
          mode={tableMode}
          responsiveSkeleton
          defaultMode="table"
          responsiveCards={false}
          showColumnVisibility={false}
          showViewToggle={false}
          classNames={{ pagination: "hidden lg:flex" }}
          noDataText={t("adminAccess.users.noData")}
          loadingText={t("adminAccess.users.loading")}
          dynamicHeight
        />
      </div>
    </NPageLayout>
  );
}
