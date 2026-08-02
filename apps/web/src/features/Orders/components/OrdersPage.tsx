"use client";

import { useCallback, useState } from "react";
import {
  BadgeCheck,
  Ban,
  CircleX,
  ClipboardCheck,
  Eye,
  ReceiptText,
  RefreshCw,
  Send,
  Trash2,
  Truck,
  UserPlus,
  UserRoundCog,
  TriangleAlert,
} from "lucide-react";
import { NButton, NPageLayout, NTable, type NTableProps, useDialog } from "najm-kit";

import { Operator } from "@/shared/Authorization";
import { useKafilRole } from "@/shared/Authorization/useKafilRole";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { useOrdersTableColumns } from "@/features/Orders/hooks/useOrdersTableColumns";
import { useOrdersTableFilters } from "@/features/Orders/hooks/useOrdersTableFilters";
import { useOrderCommands } from "@/features/Orders/hooks/useOrders";
import {
  useFamilyOrderingCommands,
} from "@/features/Orders/hooks/useFamilyOrdering";
import { createOffsetPagination, getPageIndex, hasPossibleNextPage } from "@/lib/pagination";
import { formatKafilDate, formatMad, formatStatusLabel } from "@/lib/format";
import { PageEmptyState, PageErrorState } from "@/shared/PageState";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { DashboardPageHeader as NPageHeader } from "@/shared/DashboardShell/DashboardPageHeader";
import { StatusBadge } from "@/shared/StatusBadge";

import { getOrderActions, type OrderAction, type OrderCommand } from "../config/orderActions";
import { OrderCard } from "./OrderCard";
import { DeliveryDetailsSheet } from "./DeliveryDetailsSheet";
import { FamilyOrderDetailsSheet, OrderDetailsSheet } from "./OrderDetails";
import {
  ConfirmOrderCommandDialogContent,
  DeleteOrderDialogContent,
  OrderReasonDialogContent,
} from "./OrderForms";
import {
  AssignDeliveryDialogContent,
  ConfirmDeliveryDialogContent,
  FailDeliveryDialogContent,
  PurchaseOrderDialogLoader,
} from "./OrderWorkflowForms";
import { useOrdersWorkspace } from "../hooks/useOrdersWorkspace";
import type { OrderRecord } from "../types";
import type {
  FamilyOrder,
} from "@/features/Orders/familyTypes";
import type { SponsorSupportedOrder } from "@/features/Orders/sponsorTypes";

const initialPagination = createOffsetPagination(0, 25);

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
    case "viewDelivery":
      return Truck;
    case "assignDelivery":
      return UserPlus;
    case "reassignDelivery":
      return UserRoundCog;
    case "startDelivery":
      return Send;
    case "failDelivery":
      return TriangleAlert;
    case "confirmDelivery":
      return Truck;
    case "deliver":
      return Truck;
    case "cancel":
      return Ban;
  }
}

export interface OrdersPageProps {
  highlightOrderId?: string | null;
}

export function OrdersPage({ highlightOrderId = null }: Readonly<OrdersPageProps>) {
  const dialog = useDialog();
  const { t } = useKafilLanguage();
  const { isExactAdmin } = useKafilRole();
  const workspace = useOrdersWorkspace(initialPagination, highlightOrderId);
  const { setPagination } = workspace;
  const orderCommands = useOrderCommands();
  const familyCommands = useFamilyOrderingCommands();
  const [deliveryOrder, setDeliveryOrder] = useState<OrderRecord | null>(null);
  const [viewOrder, setViewOrder] = useState<OrderRecord | null>(null);
  const openDelivery = useCallback((order: OrderRecord) => {
    setDeliveryOrder(order);
  }, []);
  const columns = useOrdersTableColumns(openDelivery);
  const filters = useOrdersTableFilters();
  const familyFilters = filters.filter(
    (filter) => filter.name !== "guardianLegalNameSnapshot",
  );
  const isFamilyScope = workspace.scope === "family";
  const isSponsorScope = workspace.scope === "sponsor";
  const orders = workspace.orders ?? [];
  const pageIndex = getPageIndex(workspace.pagination);
  const pageCount = hasPossibleNextPage(orders.length, workspace.pagination)
    ? pageIndex + 2
    : pageIndex + 1;
  const [familySelectedId, setFamilySelectedId] = useState<string>("");

  function openView(order: OrderRecord) {
    setViewOrder(order);
  }

  function openConfirm(
    action: Extract<OrderCommand, "approve" | "startDelivery" | "deliver">,
    order: OrderRecord,
  ) {
    const labels = {
      approve: t("action.approveOrder"),
      startDelivery: t("common.startDelivery"),
      deliver: t("action.markDelivered"),
    };
    void dialog.openDialog({
      title: labels[action],
      description: t("common.explicitTransition"),
      children: <ConfirmOrderCommandDialogContent action={action} order={order} />,
      showButtons: false,
      size: "sm",
    });
  }

  function openWorkflow(
    action: Extract<OrderCommand, "purchase" | "replacePurchase" | "confirmDelivery">,
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
          ? t("common.recordPurchase")
          : action === "replacePurchase"
            ? t("common.replacePurchase")
            : t("common.confirmDelivery"),
      description:
        action === "confirmDelivery"
          ? t("common.confirmDeliveryDescription")
          : t("common.recordPurchaseDescription"),
      children: content,
      showButtons: false,
      size: "lg",
      height: "auto",
    });
  }

  function openReason(
    action: Extract<OrderCommand, "reject" | "cancel">,
    order: OrderRecord,
  ) {
    const isCancellation = action === "cancel";
    void dialog.openDialog({
      title: isCancellation
        ? t("operator.orders.cancelTitle")
        : t("operator.orders.rejectTitle"),
      description: isCancellation
        ? t("common.cancelOrderDescription")
        : t("common.rejectOrderDescription"),
      children: <OrderReasonDialogContent action={action} order={order} />,
      showButtons: false,
      size: "sm",
    });
  }

  function openDelete(order: OrderRecord) {
    void dialog.openDialog({
      title: t("operator.orders.deleteTitle", { number: order.orderNumber }),
      description: t("operator.orders.deleteDescription"),
      children: <DeleteOrderDialogContent order={order} />,
      showButtons: false,
      size: "sm",
    });
  }

  function openDeliveryCommand(
    action: Extract<OrderCommand, "assignDelivery" | "reassignDelivery" | "failDelivery">,
    order: OrderRecord,
  ) {
    const reassign = action === "reassignDelivery";
    const failed = action === "failDelivery";
    void dialog.openDialog({
      title: failed
        ? t("operator.orders.delivery.failed")
        : reassign
          ? t("operator.orders.changeDeliveryStaff")
          : t("operator.orders.assignDelivery"),
      description: failed
        ? "Close this attempt and make the purchased order available for reassignment."
        : "Choose from active Staff records with the Delivery role.",
      children: failed ? (
        <FailDeliveryDialogContent order={order} />
      ) : (
        <AssignDeliveryDialogContent order={order} reassign={reassign} />
      ),
      showButtons: false,
      size: "sm",
    });
  }

  function runOrderAction(action: OrderAction, order: OrderRecord) {
    if (action.command === "viewDelivery") {
      openDelivery(order);
      return;
    }
    if (["assignDelivery", "reassignDelivery", "failDelivery"].includes(action.command)) {
      openDeliveryCommand(
        action.command as Extract<
          OrderCommand,
          "assignDelivery" | "reassignDelivery" | "failDelivery"
        >,
        order,
      );
      return;
    }
    if (action.requiresReason) {
      openReason(
        action.command as Extract<OrderCommand, "reject" | "cancel">,
        order,
      );
      return;
    }
    if (["purchase", "replacePurchase", "confirmDelivery"].includes(action.command)) {
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
  }

  const headerTitle = isFamilyScope
    ? t("common.orderYourOrders")
    : isSponsorScope
      ? t("dashboard.sponsor.supportedOrders")
      : t("operator.orders.title");
  const headerSubtitle = isFamilyScope
    ? t("common.orderYourOrdersSubtitle")
    : isSponsorScope
      ? t("dashboard.sponsor.privacySafeOrders")
      : t("operator.orders.subtitle");
  const headerIcon = ClipboardCheck;

  const operatorRows = orders as OrderRecord[];

  const operatorTableProps: NTableProps<OrderRecord> = {
    data: operatorRows,
    columns,
    filters,
    loading: workspace.loading,
    error: workspace.error,
    getRowId: (order) => order.id,
    onView: openView,
    renderCard: ({ "data-row-id": rowId, ...rest }) => (
      <OrderCard
        {...rest}
        audience="management"
        highlighted={highlightOrderId !== null && rowId === highlightOrderId}
      />
    ),
    renderEmpty: () => (
      <Operator>
        <PageEmptyState
          icon={ClipboardCheck}
          title={t("operator.orders.emptyTitle")}
          description={t("operator.orders.emptyDescription")}
        />
      </Operator>
    ),
    renderError: (error) => (
      <PageErrorState error={error} onRetry={() => void workspace.refetch()} />
    ),
    menu: {
      row: (order) => {
        const actions = [
          {
          label: t("common.view"),
          icon: Eye,
          onSelect: () => openView(order),
          },
          ...getOrderActions(order).map((action) => ({
            label: t(action.label as Parameters<typeof t>[0]),
            icon: getOrderActionIcon(action.command),
            danger: action.danger,
            disabled:
              action.command === "viewDelivery"
                ? false
                : orderCommands[action.command].isPending,
            separatorBefore: true,
            onSelect: () => runOrderAction(action, order),
          })),
        ];
        if (!isExactAdmin) return actions;
        return [
          ...actions,
          {
            label: t("common.deleteForever"),
            icon: Trash2,
            danger: true,
            separatorBefore: true,
            disabled: orderCommands.remove.isPending,
            onSelect: () => openDelete(order),
          },
        ];
      },
    },
    menuButton: true,
    manualPagination: true,
    pagination: { pageIndex, pageSize: workspace.pagination.limit },
    pageCount,
    onPaginationChange: ({ pageIndex: nextIndex, pageSize }) =>
      setPagination(createOffsetPagination(nextIndex, pageSize)),
    pageSizeOptions: [10, 25, 50, 100],
    responsiveCards: true,
    defaultMode: "table",
    showViewToggle: false,
    noDataText: t("operator.orders.noData"),
    loadingText: t("operator.orders.loading"),
    dynamicHeight: true,
  };

  const familyOrders = orders as FamilyOrder[];
  const familyTableProps: NTableProps<FamilyOrder> = {
    data: familyOrders,
    filters: familyFilters,
    columns: [
      { accessorKey: "orderNumber", header: "Order" },
      {
        accessorKey: "totalMinor",
        header: "Total",
        cell: ({ getValue }) => formatMad(getValue<number>()),
      },
      {
        accessorKey: "articleCount",
        header: "Articles",
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
      },
      {
        id: "delivery",
        header: t("operator.orders.delivery.column"),
        enableSorting: false,
        cell: ({ row }) => {
          const order = row.original;
          if (order.deliveryName) return order.deliveryName;
          return t("operator.orders.delivery.notAssigned");
        },
      },
      {
        accessorKey: "createdAt",
        header: "Placed",
        cell: ({ getValue }) => formatKafilDate(getValue<string>()),
      },
    ],
    loading: workspace.loading,
    error: workspace.error,
    getRowId: (order) => order.id,
    onView: (order) => setFamilySelectedId(order.id),
    renderCard: ({ "data-row-id": rowId, ...props }) => (
      <OrderCard
        data={props.data}
        audience="family"
        highlighted={highlightOrderId !== null && rowId === highlightOrderId}
        actions={
          <div className="flex justify-end gap-2">
            <NButton
              size="sm"
              variant="outline"
              onClick={() => setFamilySelectedId(props.data.id)}
            >
              {t("common.orderTrack")}
            </NButton>
            {props.data.status === "pending" ? (
              <NButton
                size="sm"
                variant="outline"
                disabled={familyCommands.cancel.isPending}
                onClick={() =>
                  void familyCommands.cancel.mutateAsync({ id: props.data.id })
                }
              >
                {t("common.orderCancel")}
              </NButton>
            ) : null}
          </div>
        }
      />
    ),
    renderEmpty: () => (
      <PageEmptyState
        icon={ClipboardCheck}
        title={t("common.orderNoOrdersTitle")}
        description={t("common.orderNoOrdersDescription")}
      />
    ),
    renderError: (error) => (
      <PageErrorState error={error} onRetry={() => void workspace.refetch()} />
    ),
    menu: {
      row: (order) => [
        {
          label: t("common.orderTrack"),
          icon: Eye,
          onSelect: () => setFamilySelectedId(order.id),
        },
        ...(order.status === "pending"
          ? [{
              label: t("common.orderCancel"),
              icon: Ban,
              danger: true,
              disabled: familyCommands.cancel.isPending,
              onSelect: () =>
                void familyCommands.cancel.mutateAsync({ id: order.id }),
            }]
          : []),
      ],
    },
    menuButton: true,
    manualPagination: true,
    pagination: { pageIndex, pageSize: workspace.pagination.limit },
    pageCount,
    onPaginationChange: ({ pageIndex: nextIndex, pageSize }) =>
      setPagination(createOffsetPagination(nextIndex, pageSize)),
    pageSizeOptions: [10, 25, 50, 100],
    responsiveCards: true,
    defaultMode: "table",
    showViewToggle: false,
    noDataText: t("common.orderNoOrdersTitle"),
    loadingText: t("common.loadingOrders"),
    dynamicHeight: true,
  };

  const sponsorOrders = orders as SponsorSupportedOrder[];
  const sponsorTableProps: NTableProps<SponsorSupportedOrder> = {
    data: sponsorOrders,
    columns: [
      { accessorKey: "orderNumber", header: "Order" },
      {
        accessorKey: "totalMinor",
        header: "Total",
        cell: ({ row }) =>
          formatMad(row.original.actualTotalMinor ?? row.original.totalMinor),
      },
      {
        id: "items",
        header: t("dashboard.sponsor.items"),
        cell: ({ row }) =>
          row.original.items.reduce((total, item) => total + item.quantity, 0),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => formatStatusLabel(getValue<string>()),
      },
      {
        accessorKey: "placedAt",
        header: "Placed",
        cell: ({ getValue }) => formatKafilDate(getValue<string>()),
      },
    ],
    loading: workspace.loading,
    error: workspace.error,
    getRowId: (order) => order.id,
    renderCard: ({ data }) => (
      <OrderCard
        audience="sponsor"
        data={{
          ...data,
          articleCount: data.items.reduce(
            (total, item) => total + item.quantity,
            0,
          ),
          requestedTotalMinor: data.totalMinor,
        }}
      />
    ),
    renderEmpty: () => (
      <PageEmptyState
        icon={ClipboardCheck}
        title={t("dashboard.sponsor.supportedOrders")}
        description={t("dashboard.sponsor.noSupportedOrders")}
      />
    ),
    renderError: (error) => (
      <PageErrorState error={error} onRetry={() => void workspace.refetch()} />
    ),
    manualPagination: true,
    pagination: { pageIndex, pageSize: workspace.pagination.limit },
    pageCount,
    onPaginationChange: ({ pageIndex: nextIndex, pageSize }) =>
      setPagination(createOffsetPagination(nextIndex, pageSize)),
    pageSizeOptions: [10, 25, 50, 100],
    responsiveCards: true,
    defaultMode: "table",
    showViewToggle: false,
    noDataText: t("dashboard.sponsor.noSupportedOrders"),
    loadingText: t("common.loadingOrders"),
    dynamicHeight: true,
  };

  return (
    <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
      <NPageHeader
        icon={headerIcon}
        title={headerTitle}
        subtitle={headerSubtitle}
        actions={<PageHeaderGlobalActions />}
      />

      {isFamilyScope ? (
        <>
          <div className="min-h-0 flex-1">
            <NTable {...familyTableProps} />
          </div>
        </>
      ) : isSponsorScope ? (
        <div className="min-h-0 flex-1">
          <NTable {...sponsorTableProps} />
        </div>
      ) : (
        <div className="min-h-0 flex-1">
          <NTable {...operatorTableProps} />
        </div>
      )}
      <DeliveryDetailsSheet
        open={deliveryOrder !== null}
        order={deliveryOrder}
        onOpenChange={(open) => {
          if (!open) setDeliveryOrder(null);
        }}
        onAction={(command, order) => {
          const action = getOrderActions(order).find(
            (candidate) => candidate.command === command,
          );
          if (action) runOrderAction(action, order);
        }}
      />
      <OrderDetailsSheet
        open={viewOrder !== null}
        order={viewOrder}
        onOpenChange={(open) => {
          if (!open) setViewOrder(null);
        }}
      />
      <FamilyOrderDetailsSheet
        open={familySelectedId !== ""}
        orderId={familySelectedId}
        orderNumber={
          familyOrders.find((order) => order.id === familySelectedId)?.orderNumber ?? null
        }
        onOpenChange={(open) => {
          if (!open) setFamilySelectedId("");
        }}
      />
    </NPageLayout>
  );
}
