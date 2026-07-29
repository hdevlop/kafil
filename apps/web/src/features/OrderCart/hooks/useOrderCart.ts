"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";

import { useOrderCartStore, selectOrderCartViewModel } from "../store/orderCartStore";
import type {
  OrderCartDraftItem,
  OrderCartViewModel,
} from "../types";
import { orderKeys } from "@/features/Orders/hooks/orderKeys";
import {
  useFamilyCart,
  useFamilyOrderingCommands,
} from "@/features/FamilyOrdering/hooks/useFamilyOrdering";
import { familyOrderingKeys } from "@/features/FamilyOrdering/hooks/familyOrderingKeys";
import { useOrderCommands } from "@/features/Orders/hooks/useOrders";
import { catalogWriteKeys } from "@/hooks/catalogWriteKeys";
import { budgetKeys } from "@/features/Budgets/hooks/budgetKeys";
import type { FamilyCartItem } from "@/features/FamilyOrdering/types";
import { useKafilRole } from "@/shared/Authorization";

export interface OrderCartAddInput {
  productId: string;
  productName: string;
  sku: string;
  imageUrl?: string | null;
  quantity: number;
  estimatedUnitPriceMinor: number;
  currency?: "MAD" | string;
}

export interface OrderCartSaveAssistedInput {
  familyProfileId: string;
  assistanceChannel: "phone" | "in_person" | "home_visit" | "other";
  assistanceNote?: string;
}

export type OrderCartSaveInput =
  | ({ mode: "assisted" } & OrderCartSaveAssistedInput)
  | { mode: "family" };

export interface OrderCartSaveResult {
  orderId: string;
  orderNumber?: string;
}

export interface UseOrderCart {
  mode: "assisted" | "family";
  items: OrderCartDraftItem[];
  distinctItemCount: number;
  totalQuantity: number;
  estimatedTotalMinor: number;
  loading: boolean;
  saving: boolean;
  add: (input: OrderCartAddInput) => Promise<void>;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  reset: () => void;
  save: (input: OrderCartSaveInput) => Promise<OrderCartSaveResult | null>;
  viewModel: OrderCartViewModel;
}

function familyCartToViewModel(cart: {
  items: FamilyCartItem[];
}): OrderCartViewModel {
  const items: OrderCartDraftItem[] = cart.items.map((item) => ({
    productId: item.productId,
    productName: item.productName,
    sku: item.sku,
    quantity: item.quantity,
    estimatedUnitPriceMinor: item.unitPriceMinor,
    currency: item.currency,
    available: item.available,
  }));
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  let total = 0;
  for (const item of items) {
    const line = item.estimatedUnitPriceMinor * item.quantity;
    if (!Number.isSafeInteger(line)) {
      throw new Error("Line total exceeds the safe integer range.");
    }
    total += line;
  }
  if (total > Number.MAX_SAFE_INTEGER) {
    throw new Error("Estimated total exceeds the safe integer range.");
  }
  return {
    items,
    distinctItemCount: items.length,
    totalQuantity,
    estimatedTotalMinor: total,
  };
}

export function useOrderCart(): UseOrderCart {
  const { exact, isExactFamily } = useKafilRole();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isAssisted = exact === "admin" || exact === "operator";

  const mode = isExactFamily ? "family" : "assisted";
  const draftItems = useOrderCartStore((state) => state.draftItems);
  const addItem = useOrderCartStore((state) => state.addItem);
  const setQuantity = useOrderCartStore((state) => state.setQuantity);
  const removeItem = useOrderCartStore((state) => state.removeItem);
  const reset = useOrderCartStore((state) => state.reset);

  const familyCart = useFamilyCart({ enabled: isExactFamily });
  const familyCommands = useFamilyOrderingCommands();
  const operatorCommands = useOrderCommands();

  const draftViewModel = useMemo(
    () => selectOrderCartViewModel({ draftItems } as never),
    [draftItems],
  );

  const viewModel = useMemo<OrderCartViewModel>(() => {
    if (isExactFamily) {
      if (!familyCart.data) {
        return {
          items: [],
          distinctItemCount: 0,
          totalQuantity: 0,
          estimatedTotalMinor: 0,
        };
      }
      try {
        return familyCartToViewModel(familyCart.data);
      } catch {
        return {
          items: [],
          distinctItemCount: 0,
          totalQuantity: 0,
          estimatedTotalMinor: 0,
        };
      }
    }
    return draftViewModel;
  }, [isExactFamily, familyCart.data, draftViewModel]);

  const saving = isExactFamily
    ? familyCommands.submit.isPending
    : isAssisted && operatorCommands.assisted.isPending;

  async function add(input: OrderCartAddInput): Promise<void> {
    if (isExactFamily) {
      await familyCommands.add.mutateAsync({
        productId: input.productId,
        quantity: input.quantity,
      });
      return;
    }
    if (!isAssisted) throw new Error("Order cart is unavailable for this role.");
    addItem({
      productId: input.productId,
      productName: input.productName,
      sku: input.sku,
      imageUrl: input.imageUrl ?? null,
      quantity: input.quantity,
      estimatedUnitPriceMinor: input.estimatedUnitPriceMinor,
      currency: input.currency ?? "MAD",
      available: true,
    });
  }

  function setQuantityFor(productId: string, quantity: number): void {
    if (isExactFamily) {
      void familyCommands.setQuantity
        .mutateAsync({ productId, quantity })
        .catch(() => undefined);
      return;
    }
    if (!isAssisted) return;
    setQuantity(productId, quantity);
  }

  function remove(productId: string): void {
    if (isExactFamily) {
      void familyCommands.remove.mutateAsync(productId).catch(() => undefined);
      return;
    }
    if (!isAssisted) return;
    removeItem(productId);
  }

  function resetCart(): void {
    if (isExactFamily) {
      void familyCommands.clear.mutateAsync().catch(() => undefined);
      return;
    }
    if (!isAssisted) return;
    reset();
  }

  async function save(input: OrderCartSaveInput): Promise<OrderCartSaveResult | null> {
    if (input.mode === "family") {
      if (!isExactFamily) {
        throw new Error("Family cart submission requires a family principal.");
      }
      const result = await familyCommands.submit.mutateAsync(
        crypto.randomUUID(),
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: familyOrderingKeys.all }),
        queryClient.invalidateQueries({ queryKey: orderKeys.all }),
        queryClient.invalidateQueries({ queryKey: budgetKeys.all }),
      ]);
      router.push(`/orders?created=${encodeURIComponent(result.id)}`);
      return { orderId: result.id, orderNumber: result.orderNumber };
    }

    if (!isAssisted) {
      throw new Error("Assisted submission requires an operator principal.");
    }

    const items = Object.values(draftItems);
    if (items.length === 0) return null;

    const result = await operatorCommands.assisted.mutateAsync({
      familyProfileId: input.familyProfileId,
      assistanceChannel: input.assistanceChannel,
      assistanceNote: input.assistanceNote || undefined,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      idempotencyKey: crypto.randomUUID(),
    });
    reset();
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: orderKeys.all }),
      ...catalogWriteKeys.map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
      queryClient.invalidateQueries({ queryKey: budgetKeys.all }),
      queryClient.invalidateQueries({ queryKey: familyOrderingKeys.all }),
    ]);
    router.push(`/orders?created=${encodeURIComponent(result.id)}`);
    return { orderId: result.id, orderNumber: result.orderNumber };
  }

  return {
    mode,
    items: viewModel.items,
    distinctItemCount: viewModel.distinctItemCount,
    totalQuantity: viewModel.totalQuantity,
    estimatedTotalMinor: viewModel.estimatedTotalMinor,
    loading: isExactFamily ? familyCart.isPending : false,
    saving,
    add,
    setQuantity: setQuantityFor,
    remove,
    reset: resetCart,
    save,
    viewModel,
  };
}

export const orderCartInvalidationKeys = [
  orderKeys.all,
  budgetKeys.all,
  familyOrderingKeys.all,
  ...catalogWriteKeys,
] as const;
