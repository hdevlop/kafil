"use client";

import { useState } from "react";
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
} from "lucide-react";
import { NButton, NPageLayout, NTable, type NTableProps, useDialog } from "najm-kit";

import { Family, Operator } from "@/shared/Authorization";
import { useKafilRole } from "@/shared/Authorization/useKafilRole";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { useOrdersTableColumns } from "@/features/Orders/hooks/useOrdersTableColumns";
import { useOrdersTableFilters } from "@/features/Orders/hooks/useOrdersTableFilters";
import { useOrderCommands } from "@/features/Orders/hooks/useOrders";
import {
  useFamilyOrder,
  useFamilyOrderingCommands,
} from "@/features/FamilyOrdering/hooks/useFamilyOrdering";
import { createOffsetPagination, getPageIndex, hasPossibleNextPage } from "@/lib/pagination";
import { formatKafilDate, formatMad, formatStatusLabel } from "@/lib/format";
import { PageEmptyState, PageErrorState } from "@/shared/PageState";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { DashboardPageHeader as NPageHeader } from "@/shared/DashboardShell/DashboardPageHeader";
import { StatusBadge } from "@/shared/StatusBadge";

import { getOrderActions, type OrderCommand } from "../config/orderActions";
import { OrderCard } from "./OrderCard";
import { OrderDetails } from "./OrderDetails";
import {
  ConfirmOrderCommandDialogContent,
  DeleteOrderDialogContent,
  OrderReasonDialogContent,
} from "./OrderForms";
import {
  ConfirmDeliveryDialogContent,
  PurchaseOrderDialogLoader,
} from "./OrderWorkflowForms";
import { useOrdersWorkspace } from "../hooks/useOrdersWorkspace";
import type { OrderRecord } from "../types";
import type {
  FamilyOrder,
  FamilyOrderDetail,
  FamilyOrderStatusEvent,
} from "@/features/FamilyOrdering/types";

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
  const columns = useOrdersTableColumns();
  const filters = useOrdersTableFilters();
  const isFamilyScope = workspace.scope === "family";
  const orders = (workspace.orders ?? []) as OrderRecord[] & FamilyOrder[];
  const pageIndex = getPageIndex(workspace.pagination);
  const pageCount = hasPossibleNextPage(orders.length, workspace.pagination)
    ? pageIndex + 2
    : pageIndex + 1;
  const [familySelectedId, setFamilySelectedId] = useState<string>("");
  const familyDetail = useFamilyOrder(familySelectedId);

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
      height: "xl",
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

  const headerTitle = isFamilyScope
    ? t("common.orderYourOrders")
    : t("operator.orders.title");
  const headerSubtitle = isFamilyScope
    ? t("common.orderYourOrdersSubtitle")
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
          ...getOrderActions(order.status).map((action) => ({
            label: action.label,
            icon: getOrderActionIcon(action.command),
            danger: action.danger,
            disabled: orderCommands[action.command].isPending,
            separatorBefore: true,
            onSelect: () => {
              if (action.requiresReason) {
                openReason(
                  action.command as Extract<OrderCommand, "reject" | "cancel">,
                  order,
                );
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
    noDataText: t("operator.orders.noData"),
    loadingText: t("operator.orders.loading"),
    dynamicHeight: true,
  };

  const familyOrders = orders as FamilyOrder[];

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
          {workspace.loading ? (
            <p className="text-sm text-muted-foreground">
              {t("common.loadingOrders")}
            </p>
          ) : workspace.error ? (
            <PageErrorState
              error={workspace.error}
              onRetry={() => void workspace.refetch()}
            />
          ) : familyOrders.length ? (
            <>
              <div className="grid gap-3 lg:grid-cols-2">
                {familyOrders.map((order) => (
                  <FamilyOrderCard
                    key={order.id}
                    highlighted={highlightOrderId === order.id}
                    order={order}
                    pending={familyCommands.cancel.isPending}
                    t={t}
                    onCancel={() =>
                      void familyCommands.cancel.mutateAsync({ id: order.id })
                    }
                    onTrack={() => setFamilySelectedId(order.id)}
                  />
                ))}
              </div>
              <div className="flex justify-between">
                <NButton
                  variant="outline"
                  disabled={pageIndex === 0}
                  onClick={() =>
                    workspace.setPagination(
                      createOffsetPagination(pageIndex - 1, workspace.pagination.limit),
                    )
                  }
                >
                  {t("action.previous", { defaultValue: "Previous" })}
                </NButton>
                <NButton
                  variant="outline"
                  disabled={!hasPossibleNextPage(familyOrders.length, workspace.pagination)}
                  onClick={() =>
                    workspace.setPagination(
                      createOffsetPagination(pageIndex + 1, workspace.pagination.limit),
                    )
                  }
                >
                  {t("action.next", { defaultValue: "Next" })}
                </NButton>
              </div>
              {familySelectedId ? (
                <FamilyOrderTimeline
                  detail={familyDetail.data}
                  loading={familyDetail.isPending}
                  t={t}
                />
              ) : null}
            </>
          ) : (
            <Family>
              <PageEmptyState
                icon={ClipboardCheck}
                title={t("common.orderNoOrdersTitle")}
                description={t("common.orderNoOrdersDescription")}
              />
            </Family>
          )}
        </>
      ) : (
        <div className="min-h-0 flex-1">
          <NTable {...operatorTableProps} />
        </div>
      )}
    </NPageLayout>
  );
}

interface FamilyOrderCardProps {
  order: FamilyOrder;
  pending: boolean;
  highlighted: boolean;
  t: ReturnType<typeof useKafilLanguage>["t"];
  onCancel: () => void;
  onTrack: () => void;
}

function FamilyOrderCard({
  order,
  pending,
  highlighted,
  t,
  onCancel,
  onTrack,
}: Readonly<FamilyOrderCardProps>) {
  return (
    <div
      className={`rounded-2xl border p-4 text-card-foreground transition-colors ${
        highlighted
          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
          : "border-border bg-card"
      }`}
      data-highlighted={highlighted ? "true" : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{order.orderNumber}</p>
          <p className="text-sm text-muted-foreground">
            {t("common.orderPlacedOn", {
              date: formatKafilDate(order.createdAt),
            })}
            {order.assisted ? ` · ${t("common.orderCreatedWithAssistance")}` : ""}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div className="mt-3 space-y-1 text-sm text-muted-foreground">
        <p>
          {t("common.requestedAmount", {
            amount: formatMad(order.requestedTotalMinor ?? order.totalMinor),
          })}
        </p>
        {order.actualTotalMinor !== null ? (
          <p>
            {t("common.orderActualCharged", {
              amount: formatMad(order.actualTotalMinor),
            })}{" "}
            ·{" "}
            {order.merchantName || t("common.orderActualMerchant")}
          </p>
        ) : (
          <p>{t("common.orderAwaitingReceipt")}</p>
        )}
        {order.receiptRecorded ? (
          <p>{t("common.orderReceiptRecorded")}</p>
        ) : null}
        {order.deliveryStartedAt ? (
          <p>
            {t("common.orderDeliveryStarted", {
              date: formatKafilDate(order.deliveryStartedAt),
            })}
          </p>
        ) : null}
        {order.deliveryProofRecorded ? (
          <p>{t("common.orderDeliveryProofRecorded")}</p>
        ) : null}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className="font-semibold">
          {formatMad(order.actualTotalMinor ?? order.totalMinor)}
        </p>
        <div className="flex gap-2">
          <NButton size="sm" variant="outline" onClick={onTrack}>
            {t("common.orderTrack")}
          </NButton>
          {order.status === "pending" ? (
            <Family>
              <NButton
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={onCancel}
              >
                {t("common.orderCancel")}
              </NButton>
            </Family>
          ) : null}
        </div>
      </div>
    </div>
  );
}

interface FamilyOrderTimelineProps {
  detail: FamilyOrderDetail | null | undefined;
  loading: boolean;
  t: ReturnType<typeof useKafilLanguage>["t"];
}

function FamilyOrderTimeline({
  detail,
  loading,
  t,
}: Readonly<FamilyOrderTimelineProps>) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-card-foreground">
      <p className="text-sm font-medium">{t("family.cart.reviewTitle")}</p>
      <p className="text-sm text-muted-foreground">
        {detail?.orderNumber ?? t("common.loading")}
      </p>
      {loading ? (
        <p className="mt-2 text-sm">{t("common.loading")}</p>
      ) : null}
      {detail?.statusEvents.map((event: FamilyOrderStatusEvent) => (
        <div className="mt-3 border-t border-border pt-3" key={event.id}>
          <p className="font-medium">{formatStatusLabel(event.toStatus)}</p>
          <p className="text-sm text-muted-foreground">
            {formatKafilDate(event.createdAt)}
            {event.reason ? ` - ${event.reason}` : ""}
          </p>
        </div>
      ))}
    </div>
  );
}
