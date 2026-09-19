"use client";

import type { ReactNode } from "react";
import { NBadge } from "najm-kit";

import { OrderConfirmationStep } from "@/features/OrderCart/components/OrderCartDialog";

export interface OrderSummaryItem {
  productId: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  imageUrl: string | null;
  quantity: number;
  unitPriceMinor: number;
}

export interface OrderSummaryOrder {
  status: string;
  currency: string;
  requestedTotalMinor: number;
  guardianLegalNameSnapshot: string;
  familyImage: string | null;
  deliveryAddressSnapshot: string;
  deliveryPhoneSnapshot: string | null;
  items: OrderSummaryItem[];
}

/**
 * The one Family + Products order presentation. Operator, Family, and the
 * assigned Delivery worker all render this and append their own sections as
 * children; nobody re-implements the family card, product lines, or money
 * formatting.
 */
export function OrderSummarySections({
  order,
  familyMode = false,
  familyDetails,
  leadingContent,
  afterFamily,
  showProductsDivider,
  children,
}: Readonly<{
  order: OrderSummaryOrder;
  familyMode?: boolean;
  familyDetails?: ReactNode;
  leadingContent?: ReactNode;
  afterFamily?: ReactNode;
  showProductsDivider?: boolean;
  children?: ReactNode;
}>) {
  return (
    <OrderConfirmationStep
      family={{
        name: order.guardianLegalNameSnapshot,
        image: order.familyImage,
        exactAddress: order.deliveryAddressSnapshot,
        phone: order.deliveryPhoneSnapshot,
        availableMinor: null,
      }}
      familyMode={familyMode}
      familyStatus={<NBadge status={order.status} />}
      familyDetails={familyDetails}
      leadingContent={leadingContent}
      afterFamily={afterFamily}
      showProductsDivider={showProductsDivider}
      separateSections
      showNotice={false}
      totalMinor={order.requestedTotalMinor}
      items={order.items.map((item) => ({
        productId: item.productId,
        productName: item.productNameSnapshot,
        sku: item.skuSnapshot,
        imageUrl: item.imageUrl,
        quantity: item.quantity,
        estimatedUnitPriceMinor: item.unitPriceMinor,
        currency: order.currency,
        available: true,
      }))}
    >
      {children}
    </OrderConfirmationStep>
  );
}
