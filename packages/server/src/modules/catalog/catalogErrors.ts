import { HttpError } from "najm-core";

export type PristinenessBlock = {
  productId: string;
  productName: string;
  reason: "order_history";
};

export interface PristinenessConflict {
  blockers: PristinenessBlock[];
}

export function catalogNotPristine(blockers: PristinenessBlock[]): never {
  const summary =
    blockers.length === 1
      ? `${blockers[0].productName} (${blockers[0].reason})`
      : `${blockers.length} catalog items (${blockers
          .map((b) => `${b.productName}:${b.reason}`)
          .join("; ")})`;
  HttpError.conflict(
    `Catalog items have order history; deactivate instead (${summary})`,
  );
}

export function categoryNotFound(): never {
  HttpError.notFound("Category not found");
}

export function productNotFound(): never {
  HttpError.notFound("Product not found");
}
