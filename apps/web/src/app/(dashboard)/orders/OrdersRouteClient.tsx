"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

import { OrdersPage } from "@/features/Orders";

const HIGHLIGHT_GRACE_MS = 1500;

export default function OrdersRouteClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const created = searchParams.get("created");

  useEffect(() => {
    if (!created) return;
    const timeout = setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      next.delete("created");
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    }, HIGHLIGHT_GRACE_MS);
    return () => clearTimeout(timeout);
  }, [created, pathname, router, searchParams]);

  return <OrdersPage highlightOrderId={created} />;
}
