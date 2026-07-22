"use client";

import {
  Eye,
  Pencil,
  Trash2,
  UserRoundCheck,
  UserRoundX,
} from "lucide-react";
import { useUser } from "najm-auth/client/react";
import {
  NButton,
  NPageLayout,
  NTable,
  type NTableProps,
  useDialog,
} from "najm-kit";

import { PageEmptyState, PageErrorState } from "@/shared/PageState";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { DashboardPageHeader as NPageHeader } from "@/shared/DashboardShell/DashboardPageHeader";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";

import { FamilyCard } from "./FamilyCard";
import { FamilyDetails } from "./FamilyDetails";
import {
  CreateFamilyDialogContent,
  DeleteFamilyDialogContent,
  FamilyStatusDialogContent,
  UpdateFamilyDialogContent,
} from "./FamilyForms";
import { useFamilies } from "../hooks/useFamilies";
import { useFamiliesTableColumns } from "../hooks/useFamiliesTableColumns";
import { useFamiliesTableFilters } from "../hooks/useFamiliesTableFilters";
import type { FamilyRecord } from "../types";

const FAMILY_LIST_LIMIT = 100;

function FamiliesIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3 20v-2a5 5 0 0 1 10 0v2m1-5.5A4 4 0 0 1 21 17v3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function FamiliesPage() {
  const { t } = useKafilLanguage();
  const dialog = useDialog();
  const user = useUser();
  const families = useFamilies({ limit: FAMILY_LIST_LIMIT, offset: 0 });
  const columns = useFamiliesTableColumns();
  const filters = useFamiliesTableFilters();
  const rows = families.data ?? [];

  function openCreate() {
    void dialog.openDialog({
      title: t("operator.families.createTitle"),
      children: <CreateFamilyDialogContent />,
      showButtons: false,
      size: "xl",
      height: "full",
    });
  }

  function openView(family: FamilyRecord) {
    void dialog.openDialog({
      title: family.name,
      description: t("operator.families.detailsDescription"),
      children: <FamilyDetails family={family} />,
      showButtons: false,
      width: "4xl",

    });
  }

  function openEdit(family: FamilyRecord) {
    void dialog.openDialog({
      title: t("operator.families.editTitle", { name: family.name }),
      description: t("operator.families.editDescription"),
      children: <UpdateFamilyDialogContent family={family} />,
      showButtons: false,
      size: "xl",
      height: "auto",
    });
  }

  function openStatus(family: FamilyRecord) {
    const action = family.status === "active" ? "deactivate" : "reactivate";
    void dialog.openDialog({
      title: t(action === "deactivate" ? "operator.families.deactivateTitle" : "operator.families.reactivateTitle", { name: family.name }),
      description: t("operator.families.lifecycleDescription"),
      children: (
        <FamilyStatusDialogContent action={action} family={family} />
      ),
      showButtons: false,
      size: "sm",
    });
  }

  function openDelete(family: FamilyRecord) {
    void dialog.openDialog({
      title: t("operator.families.deleteTitle", { name: family.name }),
      description: t("operator.families.deleteDescription"),
      children: <DeleteFamilyDialogContent family={family} />,
      showButtons: false,
      size: "sm",
    });
  }

  const tableProps: NTableProps<FamilyRecord> = {
    data: rows,
    columns,
    filters,
    loading: families.isPending,
    error: families.error,
    getRowId: (family) => family.id,
    onCreate: openCreate,
    onView: openView,
    onEdit: openEdit,
    onRowClick: openView,
    renderCard: FamilyCard,
    renderEmpty: () => (
      <PageEmptyState
        action={<NButton onClick={openCreate}>{t("operator.families.create")}</NButton>}
        title={t("operator.families.emptyTitle")}
        description={t("operator.families.emptyDescription")}
      />
    ),
    renderError: (error) => (
      <PageErrorState error={error} onRetry={() => void families.refetch()} />
    ),
    menu: {
      row: (family) => {
        const isActive = family.status === "active";

        const actions = [
          {
            label: t("operator.families.view"),
            icon: Eye,
            onSelect: () => openView(family),
          },
          {
            label: t("operator.families.edit"),
            icon: Pencil,
            onSelect: () => openEdit(family),
          },
          {
            label: t(isActive ? "operator.families.deactivate" : "operator.families.reactivate"),
            icon: isActive ? UserRoundX : UserRoundCheck,
            danger: isActive,
            separatorBefore: true,
            onSelect: () => openStatus(family),
          },
        ];

        if (user?.role === "admin") {
          actions.push({
            label: t("operator.families.delete"),
            icon: Trash2,
            danger: true,
            separatorBefore: true,
            onSelect: () => openDelete(family),
          });
        }

        return actions;
      },
    },
    menuButton: true,
    showPagination: false,
    responsiveCards: true,
    defaultMode: "cards",
    classNames: {
      cards: "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
    },
    addButtonText: t("operator.families.create"),
    noDataText: t("operator.families.noData"),
    loadingText: t("operator.families.loading"),
    dynamicHeight: true,
  };

  return (
    <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
      <NPageHeader
        icon={FamiliesIcon}
        title={t("operator.families.title")}
        subtitle={t("operator.families.subtitle")}
        actions={<PageHeaderGlobalActions />}
      />
      <div className="min-h-0 flex-1">
        <NTable {...tableProps} />
      </div>
    </NPageLayout>
  );
}
