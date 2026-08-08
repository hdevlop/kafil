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
import { createCardPagination, NPageHeader, NPageLayout, NTable, type NTableProps, useDialog, useDesktopTableMode } from "najm-kit";

import { useKafilRole } from "@/shared/Authorization/useKafilRole";
import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import {
  useFamilyOrderingCommands,
} from "@/features/Orders/hooks/useFamilyOrdering";
import { createOffsetPagination, getPageIndex } from "najm-kit/pagination";
import { formatKafilDate, formatMad } from "@/lib/format";
import { getFamilyAvatarImage } from "@/lib/personImages";
import { ManagedAvatar } from "@/shared/ManagedAvatar";
import { PageEmptyState, PageErrorState } from "@/shared/PageState";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
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
  CreateAssistedOrderDialogContent,
  FailDeliveryDialogContent,
  PurchaseOrderDialogLoader,
} from "./OrderWorkflowForms";
import { useOrdersWorkspace } from "../hooks/useOrdersWorkspace";
import { useOrderCommands } from "../hooks/useOrders";
import { useOrdersTableFilters } from "../hooks/useOrdersTableFilters";
import type { SharedOrderRecord } from "../sharedTypes";
import type { OrderListQuery, OrderRecord } from "../types";

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
  const { isExactAdmin, isExactFamily, isExactSponsor } = useKafilRole();
  const tableMode = useDesktopTableMode();
  const [listFilters, setListFilters] = useState<Omit<OrderListQuery, "limit" | "offset">>({});
  const workspace = useOrdersWorkspace(initialPagination, highlightOrderId, listFilters);
  const showFamilyIdentity = !isExactFamily;
  const filters = useOrdersTableFilters(showFamilyIdentity, listFilters, setListFilters);
  const { setPagination } = workspace;
  const orderCommands = useOrderCommands();
  const familyCommands = useFamilyOrderingCommands();
  const [deliveryOrder, setDeliveryOrder] = useState<SharedOrderRecord | null>(null);
  const [viewOrderId, setViewOrderId] = useState<string | null>(null);
  const [familySelectedId, setFamilySelectedId] = useState<string>("");
  const isManagement = workspace.scope === "management";

  function openCreate() {
    void dialog.openDialog({
      title: t("common.createAssistedOrder"),
      description: t("common.createAssistedOrderDescription"),
      children: <CreateAssistedOrderDialogContent />,
      showButtons: false,
      size: "xl",
      height: "auto",
    });
  }

  const openDelivery = useCallback((order: SharedOrderRecord) => {
    setDeliveryOrder(order);
  }, []);

  function openView(order: SharedOrderRecord) {
    if (isExactFamily) {
      setFamilySelectedId(order.id);
    } else {
      setViewOrderId(order.id);
    }
  }

  function openConfirm(
    action: Extract<OrderCommand, "approve" | "startDelivery" | "deliver">,
    order: SharedOrderRecord,
  ) {
    const labels = {
      approve: t("action.approveOrder"),
      startDelivery: t("common.startDelivery"),
      deliver: t("action.markDelivered"),
    };
    void dialog.openDialog({
      title: labels[action],
      description: t("common.explicitTransition"),
      children: <ConfirmOrderCommandDialogContent action={action} order={order as unknown as OrderRecord} />,
      showButtons: false,
      size: "sm",
    });
  }

  function openWorkflow(
    action: Extract<OrderCommand, "purchase" | "replacePurchase" | "confirmDelivery">,
    order: SharedOrderRecord,
  ) {
    const content =
      action === "confirmDelivery" ? (
        <ConfirmDeliveryDialogContent order={order as unknown as OrderRecord} />
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
    order: SharedOrderRecord,
  ) {
    const isCancellation = action === "cancel";
    void dialog.openDialog({
      title: isCancellation
        ? t("operator.orders.cancelTitle")
        : t("operator.orders.rejectTitle"),
      description: isCancellation
        ? t("common.cancelOrderDescription")
        : t("common.rejectOrderDescription"),
      children: <OrderReasonDialogContent action={action} order={order as unknown as OrderRecord} />,
      showButtons: false,
      size: "sm",
    });
  }

  function openDelete(order: SharedOrderRecord) {
    void dialog.openDialog({
      title: t("operator.orders.deleteTitle", { number: order.orderNumber }),
      description: t("operator.orders.deleteDescription"),
      children: <DeleteOrderDialogContent order={order as unknown as OrderRecord} />,
      showButtons: false,
      size: "sm",
    });
  }

  function openDeliveryCommand(
    action: Extract<OrderCommand, "assignDelivery" | "reassignDelivery" | "failDelivery">,
    order: SharedOrderRecord,
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
        <FailDeliveryDialogContent order={order as unknown as OrderRecord} />
      ) : (
        <AssignDeliveryDialogContent order={order as unknown as OrderRecord} reassign={reassign} />
      ),
      showButtons: false,
      size: "sm",
    });
  }

  function runOrderAction(action: OrderAction, order: SharedOrderRecord) {
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

  const headerTitle = isExactFamily
    ? t("common.orderYourOrders")
    : isExactSponsor
      ? t("dashboard.sponsor.supportedOrders")
      : t("operator.orders.title");
  const headerSubtitle = isExactFamily
    ? t("common.orderYourOrdersSubtitle")
    : isExactSponsor
      ? t("dashboard.sponsor.privacySafeOrders")
      : t("operator.orders.subtitle");

  const orders = workspace.orders;
  const pageIndex = getPageIndex(workspace.pagination);
  const pageCount = workspace.pageCount;

  const tableProps: NTableProps<SharedOrderRecord> = {
    addButtonText: isManagement ? t("common.createAssistedOrder") : undefined,
    data: orders,
    columns: [
      {
        accessorKey: "orderNumber",
        header: "Order",
        cell: ({ getValue }) => (
          <p className="truncate font-medium">{getValue<string>()}</p>
        ),
      },
      ...(showFamilyIdentity
        ? [{
            accessorKey: "guardianLegalNameSnapshot",
            header: "Family",
            cell: ({ row }: { row: { original: SharedOrderRecord } }) => (
              <ManagedAvatar
                classNames={{ avatar: "bg-muted" }}
                src={getFamilyAvatarImage(row.original.familyImage ?? null)}
                title={row.original.guardianLegalNameSnapshot ?? "—"}
              />
            ),
          }]
        : []),
      {
        accessorKey: "totalMinor",
        header: "Total",
        cell: ({ row }) =>
          formatMad(row.original.actualTotalMinor ?? row.original.totalMinor),
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
          const label = order.deliveryName
            ?? (["failed", "cancelled"].includes(order.deliveryStatus ?? "")
              ? t("operator.orders.delivery.needsReassignment")
              : t("operator.orders.delivery.notAssigned"));
          return label;
        },
      },
      {
        accessorKey: "placedAt",
        header: "Placed",
        cell: ({ getValue }) => formatKafilDate(getValue<string>()),
      },
    ],
    loading: workspace.loading,
    error: workspace.error,
    filters: showFamilyIdentity ? filters : undefined,
    getRowId: (order) => order.id,
    onView: openView,
    onRowClick: openView,
    renderCard: ({ "data-row-id": rowId, data }) => (
      <OrderCard
        data={data}
        highlighted={highlightOrderId !== null && rowId === highlightOrderId}
      />
    ),
    renderEmpty: () => (
      <PageEmptyState
        icon={ClipboardCheck}
        title={
          isExactFamily
            ? t("common.orderNoOrdersTitle")
            : isExactSponsor
              ? t("dashboard.sponsor.supportedOrders")
              : t("operator.orders.emptyTitle")
        }
        description={
          isExactFamily
            ? t("common.orderNoOrdersDescription")
            : isExactSponsor
              ? t("dashboard.sponsor.noSupportedOrders")
              : t("operator.orders.emptyDescription")
        }
      />
    ),
    renderError: (error) => (
      <PageErrorState error={error} onRetry={() => void workspace.refetch()} />
    ),
    menu: {
      row: (order) => {
        const items = [
          {
            label: t("common.view"),
            icon: Eye,
            onSelect: () => openView(order),
          },
        ];

        if (isExactFamily) {
          return [
            ...items,
            ...(order.canCancelOwn
              ? [{
                  label: t("common.orderCancel"),
                  icon: Ban,
                  danger: true,
                  disabled: familyCommands.cancel.isPending,
                  onSelect: () =>
                    void familyCommands.cancel.mutateAsync({ id: order.id }),
                }]
              : []),
          ];
        }

        if (isExactSponsor) {
          return items;
        }

        const managementOrder = order as unknown as OrderRecord;
        const actions = [
          ...items,
          ...getOrderActions(managementOrder).map((action) => ({
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
    cardPagination: createCardPagination(workspace, t),
    pageSizeOptions: [10, 25, 50, 100],
    availableModes: ["cards", "table"],
    mode: tableMode,
    responsiveSkeleton: true,
    responsiveCards: false,
    defaultMode: "table",
    showColumnVisibility: false,
    showViewToggle: false,
    classNames: { pagination: "hidden lg:flex" },
    noDataText: isExactFamily
      ? t("common.orderNoOrdersTitle")
      : isExactSponsor
        ? t("dashboard.sponsor.noSupportedOrders")
        : t("operator.orders.noData"),
    onCreate: isManagement ? openCreate : undefined,
    loadingText: t("common.loadingOrders"),
    dynamicHeight: true,
  };

  const viewingOrder: SharedOrderRecord | null = viewOrderId
    ? orders.find((o) => o.id === viewOrderId) ?? null
    : null;

  return (
    <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
      <NPageHeader
        icon={ClipboardCheck}
        title={headerTitle}
        subtitle={headerSubtitle}
        actions={<PageHeaderGlobalActions />}
      />

      <div className="min-h-0 flex-1">
        <NTable {...tableProps} />
      </div>

      {deliveryOrder ? (
        <DeliveryDetailsSheet
          open={deliveryOrder !== null}
          order={deliveryOrder as unknown as OrderRecord}
          onOpenChange={(open) => {
            if (!open) setDeliveryOrder(null);
          }}
          onAction={(command, order) => {
            const action = getOrderActions(order).find(
              (candidate) => candidate.command === command,
            );
            if (action) runOrderAction(action, deliveryOrder);
          }}
        />
      ) : null}

      {!isExactFamily ? (
        <OrderDetailsSheet
          open={viewOrderId !== null}
          order={viewingOrder}
          sponsor={isExactSponsor}
          onOpenChange={(open) => {
            if (!open) {
              setViewOrderId(null);
            }
          }}
        />
      ) : null}

      <FamilyOrderDetailsSheet
        open={familySelectedId !== ""}
        orderId={familySelectedId}
        orderNumber={
          orders.find((order) => order.id === familySelectedId)?.orderNumber ?? null
        }
        onOpenChange={(open) => {
          if (!open) setFamilySelectedId("");
        }}
      />
    </NPageLayout>
  );
}
