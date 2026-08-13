"use client";

import { useRef, useState } from "react";
import { Eye, Pencil, Trash2, UserRoundCheck, UserRoundX } from "lucide-react";
import { useUser } from "najm-auth/client/react";
import { createCardPagination, NEmptyState, NErrorState, NPageHeader, NButton, NPageLayout, NTable, type NTableProps, useDialog } from "najm-kit";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import { getPublicApiErrorMessage } from "@/services/apiError";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";

import { SponsorCard } from "./SponsorCard";
import { SponsorOverviewDialogContent } from "./SponsorOverviewDialogContent";
import { BulkDeleteSponsorsDialogContent, CreateSponsorDialogContent, DeleteSponsorDialogContent, SponsorStatusDialogContent, UpdateSponsorDialogContent } from "./SponsorForms";
import { useResponsiveSponsors } from "../hooks/useSponsors";
import { useSponsorsTableColumns } from "../hooks/useSponsorsTableColumns";
import { useSponsorsTableFilters } from "../hooks/useSponsorsTableFilters";
import type { SponsorRecord } from "../types";
import type { ListSponsorsFilters } from "@/services/sponsorApi";

function SponsorsIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="M12 3 4.5 6.5v5c0 4.7 3.2 7.9 7.5 9.5 4.3-1.6 7.5-4.8 7.5-9.5v-5L12 3Zm-3 9 2 2 4-4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function SponsorsPage() {
  const { t } = useKafilLanguage();
  const dialog = useDialog();
  const user = useUser();
  const [listFilters, setListFilters] = useState<ListSponsorsFilters>({});
  const sponsors = useResponsiveSponsors(listFilters);
  const columns = useSponsorsTableColumns();
  const filters = useSponsorsTableFilters(listFilters, setListFilters);
  const rows = sponsors.data;
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const bulkDeleteDialogOpenRef = useRef(false);
  const isAdmin = user?.role === "admin";

  function openCreate() {
    void dialog.openDialog({
      title: t("operator.sponsors.createTitle"),
      description: t("operator.sponsors.createDescription"),
      children: <CreateSponsorDialogContent />,
      showButtons: false,
      size: "xl",
      height: "auto",
    });
  }

  function openView(sponsor: SponsorRecord) {
    void dialog.openDialog({
      title: t("operator.sponsors.overviewTitle"),
      children: <SponsorOverviewDialogContent sponsorId={sponsor.id} />,
      showButtons: false,
      size: "full",
      height: "xl",
    });
  }

  function openEdit(sponsor: SponsorRecord) {
    void dialog.openDialog({
      title: t("operator.sponsors.editTitle", { name: sponsor.name }),
      description: t("operator.sponsors.editDescription"),
      children: <UpdateSponsorDialogContent sponsor={sponsor} />,
      showButtons: false,
      size: "xl",
      height: "auto",
    });
  }

  function openStatus(sponsor: SponsorRecord) {
    const action = sponsor.status === "active" ? "deactivate" : "reactivate";
    void dialog.openDialog({
      title: t(action === "deactivate" ? "operator.sponsors.deactivateTitle" : "operator.sponsors.reactivateTitle", { name: sponsor.name }),
      description: t("operator.sponsors.lifecycleDescription"),
      children: <SponsorStatusDialogContent action={action} sponsor={sponsor} />,
      showButtons: false,
      size: "sm",
    });
  }

  function openDelete(sponsor: SponsorRecord) {
    void dialog.openDialog({
      title: t("operator.sponsors.deleteTitle", { name: sponsor.name }),
      description: t("operator.sponsors.deleteDescription"),
      children: <DeleteSponsorDialogContent sponsor={sponsor} />,
      showButtons: false,
      size: "sm",
    });
  }

  function openBulkDelete(sponsorIds: string[]) {
    if (bulkDeleteDialogOpenRef.current) return;
    bulkDeleteDialogOpenRef.current = true;

    void dialog.openDialog({
      title: t("operator.sponsors.bulkDeleteTitle", {
        count: sponsorIds.length,
      }),
      description: t("operator.sponsors.bulkDeleteDescription"),
      children: (
        <BulkDeleteSponsorsDialogContent
          sponsorIds={sponsorIds}
          onDeleted={() => setRowSelection({})}
        />
      ),
      showButtons: false,
      size: "sm",
    }).finally(() => {
      bulkDeleteDialogOpenRef.current = false;
    });
  }

  const tableProps: NTableProps<SponsorRecord> = {
    data: rows,
    columns,
    filters,
    loading: sponsors.loading,
    error: sponsors.error,
    getRowId: (sponsor) => sponsor.id,
    onCreate: openCreate,
    onView: openView,
    onRowClick: openView,
    onEdit: openEdit,
    renderCard: SponsorCard,
    renderEmpty: () => <NEmptyState surface="panel" icon={<SponsorsIcon className="size-8" />} action={<NButton onClick={openCreate}>{t("operator.sponsors.create")}</NButton>} title={t("operator.sponsors.emptyTitle")} description={t("operator.sponsors.emptyDescription")} />,
    renderError: (error) => <NErrorState message={getPublicApiErrorMessage(error, t("state.retry"))} onRetry={() => void sponsors.refetch()} surface="panel" />,
    menu: {
      row: (sponsor) => {
        const isActive = sponsor.status === "active";

        const actions = [
          {
            label: t("operator.sponsors.view"),
            icon: Eye,
            onSelect: () => openView(sponsor),
          },
          {
            label: t("operator.sponsors.edit"),
            icon: Pencil,
            onSelect: () => openEdit(sponsor),
          },
          {
            label: t(isActive ? "operator.sponsors.deactivate" : "operator.sponsors.reactivate"),
            icon: isActive ? UserRoundX : UserRoundCheck,
            danger: isActive,
            separatorBefore: true,
            onSelect: () => openStatus(sponsor),
          },
        ];

        if (isAdmin) {
          actions.push({
            label: t("operator.sponsors.delete"),
            icon: Trash2,
            danger: true,
            separatorBefore: true,
            onSelect: () => openDelete(sponsor),
          });
        }

        return actions;
      },
    },
    menuButton: true,
    showCheckbox: isAdmin,
    rowSelection,
    onRowSelectionChange: setRowSelection,
    onBulkDelete: isAdmin ? openBulkDelete : undefined,
    manualPagination: true,
    pageCount: sponsors.pageCount,
    pagination: sponsors.pagination,
    onPaginationChange: sponsors.onPaginationChange,
    cardPagination: createCardPagination(sponsors, t),
    showPagination: true,
    responsiveCards: true,
    defaultMode: "cards",
    classNames: {
      cards: "grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
    },
    addButtonText: t("operator.sponsors.create"),
    noDataText: t("operator.sponsors.noData"),
    loadingText: t("operator.sponsors.loading"),
    dynamicHeight: true,
  };

  return (
    <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
      <NPageHeader icon={SponsorsIcon} title={t("operator.sponsors.title")} subtitle={t("operator.sponsors.subtitle")} actions={<PageHeaderGlobalActions />} />
      <div className="min-h-0 flex-1">
        <NTable {...tableProps} />
      </div>
    </NPageLayout>
  );
}
