import type { Metadata } from "next";
import { Suspense } from "react";

import OrdersRouteClient from "./OrdersRouteClient";

export const metadata: Metadata = { title: "Orders" };

export default function OrdersRoutePage() {
  return (
    <Suspense fallback={null}>
      <OrdersRouteClient />
    </Suspense>
  );
}
