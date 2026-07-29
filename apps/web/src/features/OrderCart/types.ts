export interface OrderCartDraftItem {
  productId: string;
  productName: string;
  sku: string;
  imageUrl?: string | null;
  quantity: number;
  estimatedUnitPriceMinor: number;
  currency: "MAD" | string;
  available: boolean;
}

export type OrderCartMode = "assisted" | "family";

export interface OrderCartState {
  ownerUserId: string | null;
  mode: OrderCartMode;
  dialogOpen: boolean;
  draftItems: Record<string, OrderCartDraftItem>;
  setMode: (mode: OrderCartMode) => void;
  setDialogOpen: (open: boolean) => void;
  addItem: (item: OrderCartDraftItem) => void;
  setQuantity: (productId: string, quantity: number) => void;
  setAvailability: (productId: string, available: boolean) => void;
  removeItem: (productId: string) => void;
  reset: () => void;
  bindSession: (userId: string | null) => void;
}

export interface OrderCartViewModel {
  items: OrderCartDraftItem[];
  distinctItemCount: number;
  totalQuantity: number;
  estimatedTotalMinor: number;
}

export const ORDER_CART_DRAFT_STORAGE_KEY_PREFIX = "kafil-order-cart-draft";
export const ORDER_CART_DRAFT_STORAGE_KEY = "kafil-order-cart-draft";
export const ORDER_CART_MAX_QUANTITY = 1_000;
export const ORDER_CART_MIN_QUANTITY = 1;
export const MAX_SAFE_INTEGER_MINOR_UNITS = Number.MAX_SAFE_INTEGER;
