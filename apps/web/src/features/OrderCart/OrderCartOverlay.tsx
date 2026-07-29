"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

import { useKafilRole } from "@/shared/Authorization";
import { useOrderCartStore } from "./store/orderCartStore";

import { FloatingOrderCartButton } from "./components/FloatingOrderCartButton";
import { OrderCartSheet } from "./components/OrderCartDialog";
import { useOrderCartSession } from "./hooks/useOrderCartSession";
import { useOrderCartDraftPersistence } from "./store/orderCartStore";

const SHOWN_ROUTES = new Set<string>(["/products", "/categories", "/orders"]);
const subscribeToHydration = () => () => undefined;

export function OrderCartOverlay() {
  useOrderCartSession();
  useOrderCartDraftPersistence();
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const pathname = usePathname() ?? "";
  const { exact } = useKafilRole();
  const dialogOpen = useOrderCartStore((state) => state.dialogOpen);
  const setDialogOpen = useOrderCartStore((state) => state.setDialogOpen);

  if (
    !hydrated ||
    (exact !== "admin" && exact !== "operator" && exact !== "family")
  ) {
    return null;
  }

  const canonical = SHOWN_ROUTES.has(pathname);
  if (!canonical) return null;

  return (
    <>
      <FloatingOrderCartButton />
      <OrderCartSheet
        open={dialogOpen}
        onOpenChange={(open) => setDialogOpen(open)}
      />
    </>
  );
}
