import type { Metadata } from "next";

import { ProductsPage } from "@/features/Products";

export const metadata: Metadata = { title: "Products" };

export default function ProductsRoutePage() {
  return <ProductsPage />;
}
