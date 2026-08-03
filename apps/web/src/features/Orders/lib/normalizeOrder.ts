import type { FamilyOrder } from "../familyTypes";
import type { SponsorSupportedOrder } from "../sponsorTypes";
import type { OrderRecord } from "../types";
import type { SharedOrderRecord } from "../sharedTypes";

export function normalizeOrderRecord(order: OrderRecord): SharedOrderRecord {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    totalMinor: order.totalMinor,
    articleCount: order.articleCount ?? 0,
    placedAt: order.createdAt,
    dominantCategoryName: order.dominantCategoryName,
    dominantCategoryImage: order.dominantCategoryImage,
    deliveryName: order.currentDelivery?.name ?? null,
    deliveryStatus: order.latestDelivery?.status ?? null,
    guardianLegalNameSnapshot: order.guardianLegalNameSnapshot,
    familyImage: order.familyImage ?? null,
    deliveryPhoneSnapshot: order.deliveryPhoneSnapshot,
    deliveryAddressSnapshot: order.deliveryAddressSnapshot,
    assistanceNote: order.assistanceNote,
    currentDelivery: order.currentDelivery
      ? { name: order.currentDelivery.name, status: order.currentDelivery.status }
      : null,
    latestDelivery: order.latestDelivery
      ? { name: order.latestDelivery.name, status: order.latestDelivery.status }
      : null,
    placementSource: order.placementSource,
    familyProfileId: order.familyProfileId,
  };
}

export function normalizeFamilyOrder(order: FamilyOrder): SharedOrderRecord {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    totalMinor: order.totalMinor,
    actualTotalMinor: order.actualTotalMinor,
    articleCount: order.articleCount,
    placedAt: order.createdAt,
    dominantCategoryName: order.dominantCategoryName,
    dominantCategoryImage: order.dominantCategoryImage,
    deliveryName: order.deliveryName,
    deliveryStatus: order.deliveryAssigned ? "assigned" : null,
    guardianLegalNameSnapshot: order.guardianLegalNameSnapshot,
    familyImage: order.familyImage,
    deliveryPhoneSnapshot: order.deliveryPhoneSnapshot,
    deliveryAddressSnapshot: order.deliveryAddressSnapshot,
    canCancelOwn: order.canCancelOwn,
  };
}

export function normalizeSponsorOrder(
  order: SponsorSupportedOrder,
): SharedOrderRecord {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    totalMinor: order.totalMinor,
    actualTotalMinor: order.actualTotalMinor,
    articleCount: order.items.reduce((total, item) => total + item.quantity, 0),
    placedAt: order.placedAt,
    dominantCategoryName: order.dominantCategoryName,
    dominantCategoryImage: order.dominantCategoryImage,
    deliveryName: order.deliveryName,
    deliveryStatus: order.deliveryStatus,
    items: order.items,
  };
}