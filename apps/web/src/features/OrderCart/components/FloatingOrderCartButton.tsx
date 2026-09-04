"use client";

import { ShoppingCart } from "lucide-react";
import { NBadge, NButton } from "najm-kit";

import { useTranslation } from "najm-i18n/react";
import { useOrderCartStore } from "../store/orderCartStore";

import { useOrderCart } from "../hooks/useOrderCart";

export function FloatingOrderCartButton() {
  const { t } = useTranslation();
  const orderCart = useOrderCart();
  const setDialogOpen = useOrderCartStore((state) => state.setDialogOpen);

  const count = orderCart.distinctItemCount;
  const ariaLabel = t("family.orderCart.ariaLabel", { count });

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-8 z-30 flex justify-end px-4 sm:bottom-10 sm:px-8"
      data-testid="floating-order-cart"
    >
      <NButton
        aria-label={ariaLabel}
        className="pointer-events-auto relative size-14 shadow-lg"
        data-testid="floating-order-cart-button"
        onClick={() => setDialogOpen(true)}
        rounded="full"
        size="icon-xl"
        type="button"
        variant="default"
      >
        <ShoppingCart aria-hidden className="size-6" strokeWidth={1.75} />
        <NBadge
          aria-hidden
          className="pointer-events-none absolute -right-1 -top-1 h-6 min-w-6 justify-center rounded-full border-2 border-background bg-foreground p-0 text-sm font-bold text-background shadow-sm"
          color="neutral"
          look="solid"
          shape="pill"
          size="sm"
        >
          {count}
        </NBadge>
      </NButton>
    </div>
  );
}
