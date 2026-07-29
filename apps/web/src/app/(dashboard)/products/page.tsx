import type { Metadata } from "next";
import { Suspense } from "react";

import ProductsRouteClient from "./ProductsRouteClient";

export const metadata: Metadata = { title: "Products" };

export default function ProductsRoutePage() {
  return (
    <Suspense fallback={null}>
      <ProductsRouteClient />
    </Suspense>
  );
}
