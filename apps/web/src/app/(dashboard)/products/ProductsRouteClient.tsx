"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ProductsPage } from "@/features/Products";
import { useOrderCartStore } from "@/features/OrderCart";

export default function ProductsRouteClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const setDialogOpen = useOrderCartStore((state) => state.setDialogOpen);
  const opened = useRef(false);

  useEffect(() => {
    if (searchParams.get("cart") === "open" && !opened.current) {
      opened.current = true;
      setDialogOpen(true);
      const next = new URLSearchParams(searchParams.toString());
      next.delete("cart");
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    }
  }, [pathname, router, searchParams, setDialogOpen]);

  return <ProductsPage />;
}
