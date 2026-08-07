"use client";

import { CheckCircle2, ClipboardList, Eye, XCircle } from "lucide-react";
import { useState } from "react";
import {
  NPageHeader,
  NPageLayout,
  NTable,
  type ContextMenuItem,
  type NTableProps,
  useDialog,
} from "najm-kit";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import { useDesktopTableMode } from "@/hooks/useDesktopTableMode";
import { createCardPagination } from "@/lib/tablePagination";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { PageEmptyState, PageErrorState } from "@/shared/PageState";

import { ApplicantCard } from "./ApplicantCard";
import { ApplicantDetails } from "./ApplicantDetails";
import {
  ApproveApplicantDialogContent,
  RejectApplicantDialogContent,
} from "./ApplicantDecisionDialogs";
import {
  useResponsiveApplicants,
} from "../hooks/useApplicants";
import { useApplicantsTableColumns } from "../hooks/useApplicantsTableColumns";
import { useApplicantsTableFilters } from "../hooks/useApplicantsTableFilters";
import type { ApplicantRecord } from "../types";
import type { ListApplicantsParams } from "../services/api";

export function ApplicantsPage() {
  const { t } = useKafilLanguage();
  const dialog = useDialog();
  const tableMode = useDesktopTableMode();
  const [query, setQuery] = useState<Omit<ListApplicantsParams, "limit" | "offset">>({});
  const applicants = useResponsiveApplicants(query);
  const columns = useApplicantsTableColumns();
  const filters = useApplicantsTableFilters(query, setQuery);
  const rows = applicants.data;

  function openView(applicant: ApplicantRecord) {
    void dialog.openDialog({
      title: t("operator.applicants.viewTitle"),
      description: t("operator.applicants.viewDescription"),
      children: <ApplicantDetails initialApplicant={applicant} />,
      showButtons: false,
      size: "lg",
      height: "auto",
    });
  }

  function openApprove(applicant: ApplicantRecord) {
    void dialog.openDialog({
      title: t("operator.applicants.approveTitle", { name: applicant.name }),
      description: t("operator.applicants.approveDescription", { name: applicant.name }),
      children: <ApproveApplicantDialogContent applicant={applicant} />,
      showButtons: false,
      size: "sm",
    });
  }

  function openReject(applicant: ApplicantRecord) {
    void dialog.openDialog({
      title: t("operator.applicants.rejectTitle", { name: applicant.name }),
      description: t("operator.applicants.rejectDescription", { name: applicant.name }),
      children: <RejectApplicantDialogContent applicant={applicant} />,
      showButtons: false,
      size: "sm",
    });
  }

  function rowActions(applicant: ApplicantRecord): ContextMenuItem[] {
    const actions: ContextMenuItem[] = [
      {
        icon: Eye,
        label: t("operator.applicants.view"),
        onSelect: () => openView(applicant),
      },
    ];
    if (applicant.status === "pending_review") {
      actions.push(
        {
          icon: XCircle,
          label: t("operator.applicants.reject"),
          danger: true,
          separatorBefore: true,
          onSelect: () => openReject(applicant),
        },
        {
          icon: CheckCircle2,
          label: t("operator.applicants.approve"),
          onSelect: () => openApprove(applicant),
        },
      );
    } else if (applicant.status === "rejected") {
      actions.push({
        icon: CheckCircle2,
        label: t("operator.applicants.approve"),
        separatorBefore: true,
        onSelect: () => openApprove(applicant),
      });
    }
    return actions;
  }

  const tableProps: NTableProps<ApplicantRecord> = {
    availableModes: ["cards", "table"],
    classNames: {
      cards: "grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
    },
    columns,
    data: rows,
    defaultMode: "cards",
    dynamicHeight: true,
    error: applicants.error,
    filters,
    getRowId: (applicant) => applicant.id,
    loading: applicants.loading,
    loadingText: t("operator.applicants.loading"),
    menu: {
      row: rowActions,
    },
    menuButton: true,
    noDataText: t("operator.applicants.noData"),
    onView: openView,
    renderCard: ApplicantCard,
    renderEmpty: () => (
      <PageEmptyState
        description={t("operator.applicants.emptyDescription")}
        icon={ClipboardList}
        title={t("operator.applicants.emptyTitle")}
      />
    ),
    renderError: (error) => (
      <PageErrorState error={error} onRetry={() => void applicants.refetch()} />
    ),
    responsiveCards: true,
    showPagination: true,
    manualPagination: true,
    pagination: applicants.pagination,
    pageCount: applicants.pageCount,
    onPaginationChange: applicants.onPaginationChange,
    cardPagination: createCardPagination(applicants, t),
    pageSizeOptions: [10, 25, 50, 100],
    mode: tableMode,
    responsiveSkeleton: true,
  };

  return (
    <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
      <NPageHeader
        actions={<PageHeaderGlobalActions />}
        icon={ClipboardList}
        subtitle={t("operator.applicants.subtitle")}
        title={t("operator.applicants.title")}
      />
      <div className="min-h-0 flex-1">
        <NTable {...tableProps} />
      </div>
    </NPageLayout>
  );
}
