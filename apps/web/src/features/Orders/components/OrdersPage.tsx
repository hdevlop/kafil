"use client";

import { useState } from "react";
import {
  BadgeCheck,
  Ban,
  CircleX,
  ClipboardCheck,
  ClipboardPlus,
  Eye,
  ReceiptText,
  RefreshCw,
  Send,
  Truck,
} from "lucide-react";
import { NButton, NPageLayout, NTable, type NTableProps, useDialog } from "najm-kit";

import { createOffsetPagination, getPageIndex, hasPossibleNextPage } from "@/lib/pagination";
import { PageEmptyState, PageErrorState } from "@/shared/PageState";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { DashboardPageHeader as NPageHeader } from "@/shared/DashboardShell/DashboardPageHeader";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";

import { getOrderActions, type OrderCommand } from "../config/orderActions";
import { OrderCard } from "./OrderCard";
import { OrderDetails } from "./OrderDetails";
import { ConfirmOrderCommandDialogContent, OrderReasonDialogContent } from "./OrderForms";
import {
  ConfirmDeliveryDialogContent,
  CreateAssistedOrderDialogContent,
  PurchaseOrderDialogLoader,
} from "./OrderWorkflowForms";
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
    case "purchase":
      return ReceiptText;
    case "replacePurchase":
      return RefreshCw;
    case "startDelivery":
      return Send;
    case "confirmDelivery":
      return Truck;
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

  function openConfirm(action: Extract<OrderCommand, "approve" | "startDelivery" | "deliver">, order: OrderRecord) {
    const labels = {
      approve: t("action.approveOrder"),
      startDelivery: "Start delivery",
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

  function openWorkflow(
    action: Extract<
      OrderCommand,
      "purchase" | "replacePurchase" | "confirmDelivery"
    >,
    order: OrderRecord,
  ) {
    const content =
      action === "confirmDelivery" ? (
        <ConfirmDeliveryDialogContent order={order} />
      ) : (
        <PurchaseOrderDialogLoader
          orderId={order.id}
          replace={action === "replacePurchase"}
        />
      );
    void dialog.openDialog({
      title:
        action === "purchase"
          ? "Record purchase"
          : action === "replacePurchase"
            ? "Replace purchase"
            : "Confirm delivery",
      description:
        action === "confirmDelivery"
          ? "Record the terminal delivery milestone and optional protected proof."
          : "Record immutable protected receipt evidence and settle the actual amount.",
      children: content,
      showButtons: false,
      size: "lg",
      height: "xl",
    });
  }

  function openAssistedOrder() {
    void dialog.openDialog({
      title: "Create assisted order",
      description:
        "Create a pending order for a family without impersonating it or changing its cart.",
      children: <CreateAssistedOrderDialogContent />,
      showButtons: false,
      size: "xl",
      height: "xl",
    });
  }

  function openReason(action: Extract<OrderCommand, "reject" | "cancel">, order: OrderRecord) {
    const isCancellation = action === "cancel";
    void dialog.openDialog({
      title: isCancellation ? "Cancel order" : "Reject order",
      description: isCancellation
        ? "An audited cancellation reverses the order's current financial effects."
        : "An audited rejection releases this pending order's budget reservation.",
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
      renderEmpty: () => (
      <PageEmptyState
        icon={ClipboardCheck}
        title={t("operator.orders.emptyTitle")}
        description={t("operator.orders.emptyDescription")}
        action={
          <NButton onClick={openAssistedOrder}>
            <ClipboardPlus className="size-4" />
            Create assisted order
          </NButton>
        }
      />
    ),
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
            if (
              ["purchase", "replacePurchase", "confirmDelivery"].includes(
                action.command,
              )
            ) {
              openWorkflow(
                action.command as Extract<
                  OrderCommand,
                  "purchase" | "replacePurchase" | "confirmDelivery"
                >,
                order,
              );
              return;
            }
            openConfirm(
              action.command as Extract<
                OrderCommand,
                "approve" | "startDelivery" | "deliver"
              >,
              order,
            );
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
