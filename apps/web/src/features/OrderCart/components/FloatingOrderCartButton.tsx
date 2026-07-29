"use client";

import { ShoppingCart } from "lucide-react";
import { NButton } from "najm-kit";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { useKafilRole } from "@/shared/Authorization";
import { useOrderCartStore } from "../store/orderCartStore";

import { useOrderCart } from "../hooks/useOrderCart";

export function FloatingOrderCartButton() {
  const { t } = useKafilLanguage();
  const { isExactFamily } = useKafilRole();
  const orderCart = useOrderCart();
  const setDialogOpen = useOrderCartStore((state) => state.setDialogOpen);

  const count = orderCart.distinctItemCount;
  const ariaLabel = t("family.orderCart.ariaLabel", { count });

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-end px-4 sm:bottom-8 sm:px-8"
      data-testid="floating-order-cart"
    >
      <NButton
        aria-label={ariaLabel}
        className="pointer-events-auto gap-2 shadow-lg"
        data-testid="floating-order-cart-button"
        onClick={() => setDialogOpen(true)}
        size="lg"
        type="button"
        variant="default"
      >
        <ShoppingCart aria-hidden className="size-4" />
        <span className="text-sm font-semibold">
          {isExactFamily
            ? t("family.orderCart.itemCount", { count })
            : t("family.orderCart.lineCount", { count })}
        </span>
        <span
          aria-hidden
          className="ml-1 inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-primary-foreground px-1.5 text-xs font-semibold text-primary"
        >
          {count}
        </span>
      </NButton>
    </div>
  );
}
