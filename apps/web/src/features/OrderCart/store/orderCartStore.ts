"use client";

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { useEffect } from "react";

import {
  MAX_SAFE_INTEGER_MINOR_UNITS,
  ORDER_CART_DRAFT_STORAGE_KEY_PREFIX,
  ORDER_CART_MAX_QUANTITY,
  ORDER_CART_MIN_QUANTITY,
  type OrderCartDraftItem,
  type OrderCartState,
  type OrderCartViewModel,
} from "../types";

const QUANTITY_BOUNDS_ERROR =
  "Quantity must be between 1 and 1,000." as const;

function clampQuantity(quantity: number) {
  if (!Number.isInteger(quantity)) {
    throw new Error(QUANTITY_BOUNDS_ERROR);
  }
  if (quantity < ORDER_CART_MIN_QUANTITY) {
    return ORDER_CART_MIN_QUANTITY;
  }
  if (quantity > ORDER_CART_MAX_QUANTITY) {
    return ORDER_CART_MAX_QUANTITY;
  }
  return quantity;
}

function safeTotalMinor(items: OrderCartDraftItem[]) {
  let total = 0;
  for (const item of items) {
    if (!Number.isSafeInteger(item.estimatedUnitPriceMinor)) {
      throw new Error("Estimated unit price is not a safe integer.");
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new Error(QUANTITY_BOUNDS_ERROR);
    }
    const line = item.estimatedUnitPriceMinor * item.quantity;
    if (!Number.isSafeInteger(line)) {
      throw new Error("Line total exceeds the safe integer range.");
    }
    total += line;
  }
  if (total > MAX_SAFE_INTEGER_MINOR_UNITS) {
    throw new Error("Estimated total exceeds the safe integer range.");
  }
  return total;
}

function buildViewModel(
  draftItems: Record<string, OrderCartDraftItem>,
): OrderCartViewModel {
  const items = Object.values(draftItems);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  return {
    items,
    distinctItemCount: items.length,
    totalQuantity,
    estimatedTotalMinor: safeTotalMinor(items),
  };
}

function storageKey(userId: string): string {
  return `${ORDER_CART_DRAFT_STORAGE_KEY_PREFIX}:${userId}`;
}

interface PersistedShape {
  ownerUserId: string;
  draftItems: Record<string, OrderCartDraftItem>;
}

function readDraft(userId: string): PersistedShape | null {
  if (typeof globalThis.sessionStorage === "undefined") return null;
  const raw = globalThis.sessionStorage.getItem(storageKey(userId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedShape>;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.ownerUserId !== userId) return null;
    if (!parsed.draftItems || typeof parsed.draftItems !== "object") {
      return null;
    }
    return { ownerUserId: userId, draftItems: parsed.draftItems };
  } catch {
    return null;
  }
}

function writeDraft(userId: string, draftItems: Record<string, OrderCartDraftItem>) {
  if (typeof globalThis.sessionStorage === "undefined") return;
  const payload: PersistedShape = { ownerUserId: userId, draftItems };
  globalThis.sessionStorage.setItem(storageKey(userId), JSON.stringify(payload));
}

function clearDraft(userId: string) {
  if (typeof globalThis.sessionStorage === "undefined") return;
  globalThis.sessionStorage.removeItem(storageKey(userId));
}

export const useOrderCartStore = create<OrderCartState>()(
  subscribeWithSelector((set, get) => ({
    ownerUserId: null,
    mode: "assisted",
    dialogOpen: false,
    draftItems: {},
    setMode: (mode) => set({ mode }),
    setDialogOpen: (open) => set({ dialogOpen: open }),
    addItem: (item) =>
      set((state) => {
        const existing = state.draftItems[item.productId];
        const nextQuantity = existing
          ? clampQuantity(existing.quantity + item.quantity)
          : clampQuantity(item.quantity);
        const nextEntry: OrderCartDraftItem = {
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          imageUrl: item.imageUrl ?? existing?.imageUrl ?? null,
          quantity: nextQuantity,
          estimatedUnitPriceMinor: item.estimatedUnitPriceMinor,
          currency: item.currency,
          available: existing ? existing.available && item.available : item.available,
        };
        return {
          draftItems: {
            ...state.draftItems,
            [item.productId]: nextEntry,
          },
        };
      }),
    setQuantity: (productId, quantity) =>
      set((state) => {
        const existing = state.draftItems[productId];
        if (!existing) return state;
        const nextQuantity = clampQuantity(quantity);
        return {
          draftItems: {
            ...state.draftItems,
            [productId]: { ...existing, quantity: nextQuantity },
          },
        };
      }),
    setAvailability: (productId, available) =>
      set((state) => {
        const existing = state.draftItems[productId];
        if (!existing || existing.available === available) return state;
        return {
          draftItems: {
            ...state.draftItems,
            [productId]: { ...existing, available },
          },
        };
      }),
    removeItem: (productId) =>
      set((state) => {
        if (!state.draftItems[productId]) return state;
        const next = { ...state.draftItems };
        delete next[productId];
        return { draftItems: next };
      }),
    reset: () => {
      const current = get().ownerUserId;
      if (current) clearDraft(current);
      set({ draftItems: {}, dialogOpen: false });
    },
    bindSession: (userId) => {
      const state = get();
      const previousOwner = state.ownerUserId;
      if (previousOwner && previousOwner !== userId) {
        clearDraft(previousOwner);
      }
      if (!userId) {
        set({ ownerUserId: null, draftItems: {}, dialogOpen: false });
        return;
      }
      if (previousOwner === userId) return;
      const persisted = readDraft(userId);
      set({
        ownerUserId: userId,
        draftItems: persisted?.draftItems ?? {},
        dialogOpen: false,
      });
    },
  })),
);

export function useOrderCartDraftPersistence(): void {
  useEffect(() => {
    const unsubscribe = useOrderCartStore.subscribe(
      (state) => ({ ownerUserId: state.ownerUserId, draftItems: state.draftItems }),
      (current) => {
        if (!current.ownerUserId) return;
        writeDraft(current.ownerUserId, current.draftItems);
      },
      {
        equalityFn: (a, b) =>
          a.ownerUserId === b.ownerUserId &&
          a.draftItems === b.draftItems,
      },
    );
    return unsubscribe;
  }, []);
}

export function selectOrderCartViewModel(
  state: OrderCartState,
): OrderCartViewModel {
  return buildViewModel(state.draftItems);
}
