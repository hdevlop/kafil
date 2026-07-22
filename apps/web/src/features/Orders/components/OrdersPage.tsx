"use client";

import { useState } from "react";
import {
  BadgeCheck,
  Ban,
  CircleX,
  ClipboardCheck,
  Eye,
  PackageCheck,
  Truck,
} from "lucide-react";
import { NPageLayout, NTable, type NTableProps, useDialog } from "najm-kit";

import { createOffsetPagination, getPageIndex, hasPossibleNextPage } from "@/lib/pagination";
import { PageEmptyState, PageErrorState } from "@/shared/PageState";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { DashboardPageHeader as NPageHeader } from "@/shared/DashboardShell/DashboardPageHeader";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";

import { getOrderActions, type OrderCommand } from "../config/orderActions";
import { OrderCard } from "./OrderCard";
import { OrderDetails } from "./OrderDetails";
import { ConfirmOrderCommandDialogContent, OrderReasonDialogContent } from "./OrderForms";
import { useOrderCommands, useOrders } from "../hooks/useOrders";
import { useOrdersTableColumns } from "../hooks/useOrdersTableColumns";
import { useOrdersTableFilters } from "../hooks/useOrdersTableFilters";
import type { OrderRecord } from "../types";

function getOrderActionIcon(action: OrderCommand) {
  switch (action) {
    case "approve":
      return BadgeCheck;
    case "reject":
      return CircleX;
    case "preparation":
      return PackageCheck;
    case "deliver":
      return Truck;
    case "cancel":
      return Ban;
  }
}

export function OrdersPage() {
  const dialog = useDialog();
  const { t } = useKafilLanguage();
  const [pagination, setPagination] = useState(() => createOffsetPagination(0, 25));
  const orders = useOrders(pagination);
  const commands = useOrderCommands();
  const columns = useOrdersTableColumns();
  const filters = useOrdersTableFilters();
  const rows = orders.data ?? [];
  const pageIndex = getPageIndex(pagination);
  const pageCount = hasPossibleNextPage(rows.length, pagination) ? pageIndex + 2 : pageIndex + 1;

  function openView(order: OrderRecord) {
    void dialog.openDialog({
      title: order.orderNumber,
      description: t("operator.orders.snapshot"),
      children: <OrderDetails orderId={order.id} />,
      showButtons: false,
      size: "lg",
      height: "xl",
    });
  }

  function openConfirm(action: Extract<OrderCommand, "approve" | "preparation" | "deliver">, order: OrderRecord) {
    const labels = {
      approve: t("action.approveOrder"),
      preparation: t("action.startPreparation"),
      deliver: t("action.markDelivered"),
    };
    void dialog.openDialog({
      title: labels[action],
      description: "This is an explicit server-owned order transition.",
      children: <ConfirmOrderCommandDialogContent action={action} order={order} />,
      showButtons: false,
      size: "sm",
    });
  }

  function openReason(action: Extract<OrderCommand, "reject" | "cancel">, order: OrderRecord) {
    const isCancellation = action === "cancel";
    void dialog.openDialog({
      title: isCancellation ? "Cancel order" : "Reject order",
      description: isCancellation
        ? "An audited cancellation reverses the order's current financial and stock effects."
        : "An audited rejection releases this pending order's reservations.",
      children: <OrderReasonDialogContent action={action} order={order} />,
      showButtons: false,
      size: "sm",
    });
  }

  const tableProps: NTableProps<OrderRecord> = {
    data: rows,
    columns,
    filters,
    loading: orders.isPending,
    error: orders.error,
    getRowId: (order) => order.id,
    onView: openView,
    renderCard: OrderCard,
    renderEmpty: () => <PageEmptyState title={t("operator.orders.emptyTitle")} description={t("operator.orders.emptyDescription")} />,
    renderError: (error) => <PageErrorState error={error} onRetry={() => void orders.refetch()} />,
    menu: {
      row: (order) => [
        {
          label: "View",
          icon: Eye,
          onSelect: () => openView(order),
        },
        ...getOrderActions(order.status).map((action) => ({
          label: action.label,
          icon: getOrderActionIcon(action.command),
          danger: action.danger,
          disabled: commands[action.command].isPending,
          separatorBefore: true,
          onSelect: () => {
            if (action.requiresReason) {
              openReason(action.command as Extract<OrderCommand, "reject" | "cancel">, order);
              return;
            }
            openConfirm(action.command as Extract<OrderCommand, "approve" | "preparation" | "deliver">, order);
          },
        })),
      ],
    },
    menuButton: true,
    manualPagination: true,
    pagination: { pageIndex, pageSize: pagination.limit },
    pageCount,
    onPaginationChange: ({ pageIndex: nextIndex, pageSize }) => setPagination(createOffsetPagination(nextIndex, pageSize)),
    pageSizeOptions: [10, 25, 50, 100],
    responsiveCards: true,
    defaultMode: "table",
    noDataText: t("operator.orders.noData"),
    loadingText: t("operator.orders.loading"),
    dynamicHeight: true,
  };

  return (
    <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
      <NPageHeader
        icon={ClipboardCheck}
        title={t("operator.orders.title")}
        subtitle={t("operator.orders.subtitle")}
        actions={<PageHeaderGlobalActions />}
      />
      <div className="min-h-0 flex-1">
        <NTable {...tableProps} />
      </div>
    </NPageLayout>
  );
}
