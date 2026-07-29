import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";

import {
  selectOrderCartViewModel,
  useOrderCartStore,
} from "../src/features/OrderCart/store/orderCartStore";
import {
  ORDER_CART_DRAFT_STORAGE_KEY_PREFIX,
  ORDER_CART_MAX_QUANTITY,
} from "../src/features/OrderCart/types";

const DRAFT_ITEM = {
  productId: "11111111-1111-4111-8111-111111111111",
  productName: "Rice 5 kg",
  sku: "RICE-5KG",
  imageUrl: "/api/product-images/files/serve/rice.png",
  quantity: 1,
  estimatedUnitPriceMinor: 4500,
  currency: "MAD",
  available: true,
} as const;

interface SessionStorageLike {
  store: Map<string, string>;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
  key(index: number): string | null;
  readonly length: number;
}

function createSessionStorage(): SessionStorageLike {
  const store = new Map<string, string>();
  return {
    store,
    getItem(key: string) {
      return store.has(key) ? (store.get(key) ?? null) : null;
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    get length() {
      return store.size;
    },
  };
}

const sessionStorage = createSessionStorage();
const globalScope = globalThis as unknown as {
  sessionStorage?: SessionStorageLike;
};
globalScope.sessionStorage = sessionStorage;

afterAll(() => {
  delete globalScope.sessionStorage;
});

function resetStore() {
  useOrderCartStore.setState({
    ownerUserId: null,
    mode: "assisted",
    dialogOpen: false,
    draftItems: {},
  });
}

function storageKey(userId: string) {
  return `${ORDER_CART_DRAFT_STORAGE_KEY_PREFIX}:${userId}`;
}

function seedDraft(userId: string, items: Record<string, unknown>) {
  sessionStorage.setItem(
    storageKey(userId),
    JSON.stringify({ ownerUserId: userId, draftItems: items }),
  );
}

describe("order cart management draft", () => {
  beforeEach(() => {
    resetStore();
    sessionStorage.clear();
  });

  afterEach(() => {
    resetStore();
    sessionStorage.clear();
  });

  test("adds a new product, increments the existing line, and computes safe totals", () => {
    const { addItem, setQuantity } = useOrderCartStore.getState();

    addItem(DRAFT_ITEM);
    addItem({ ...DRAFT_ITEM, quantity: 2 });

    const viewModel = selectOrderCartViewModel(useOrderCartStore.getState());
    expect(viewModel.distinctItemCount).toBe(1);
    expect(viewModel.totalQuantity).toBe(3);
    expect(viewModel.estimatedTotalMinor).toBe(13_500);
    expect(viewModel.items[0]?.imageUrl).toBe(DRAFT_ITEM.imageUrl);

    setQuantity(DRAFT_ITEM.productId, 4);
    const updated = selectOrderCartViewModel(useOrderCartStore.getState());
    expect(updated.totalQuantity).toBe(4);
    expect(updated.estimatedTotalMinor).toBe(18_000);
  });

  test("clamps quantity within the backend bounds", () => {
    const { addItem, setQuantity } = useOrderCartStore.getState();
    addItem(DRAFT_ITEM);

    setQuantity(DRAFT_ITEM.productId, ORDER_CART_MAX_QUANTITY + 50);
    expect(
      useOrderCartStore.getState().draftItems[DRAFT_ITEM.productId]?.quantity,
    ).toBe(ORDER_CART_MAX_QUANTITY);
  });

  test("does not publish a new draft when availability is unchanged", () => {
    const { addItem, setAvailability } = useOrderCartStore.getState();
    addItem(DRAFT_ITEM);
    const before = useOrderCartStore.getState().draftItems;

    setAvailability(DRAFT_ITEM.productId, true);

    expect(useOrderCartStore.getState().draftItems).toBe(before);
  });

  test("throws when the estimated total escapes the safe integer range", () => {
    const { addItem, bindSession } = useOrderCartStore.getState();
    bindSession("tester");
    addItem({
      ...DRAFT_ITEM,
      estimatedUnitPriceMinor: 10_000_000_000_000_000,
    });
    addItem({
      ...DRAFT_ITEM,
      productId: "22222222-2222-4222-8222-222222222222",
      quantity: 200,
    });

    expect(() =>
      selectOrderCartViewModel(useOrderCartStore.getState()),
    ).toThrow();
  });

  test("removes items, resets the draft, and forgets the bound user", () => {
    const { addItem, removeItem, reset, bindSession } =
      useOrderCartStore.getState();

    bindSession("user-1");
    addItem(DRAFT_ITEM);
    addItem({ ...DRAFT_ITEM, productId: "22222222-2222-4222-8222-222222222222" });

    removeItem(DRAFT_ITEM.productId);
    expect(useOrderCartStore.getState().draftItems).toHaveProperty(
      "22222222-2222-4222-8222-222222222222",
    );

    reset();
    expect(useOrderCartStore.getState().draftItems).toEqual({});

    bindSession("user-2");
    addItem(DRAFT_ITEM);
    bindSession("user-3");
    expect(useOrderCartStore.getState().draftItems).toEqual({});
    expect(useOrderCartStore.getState().ownerUserId).toBe("user-3");
  });

  test("rehydrates a draft for the bound user and rejects a different owner", () => {
    expect(typeof globalThis.sessionStorage).toBe("object");
    const userA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const userB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const persistedItem = {
      productId: DRAFT_ITEM.productId,
      productName: DRAFT_ITEM.productName,
      sku: DRAFT_ITEM.sku,
      quantity: 2,
      estimatedUnitPriceMinor: DRAFT_ITEM.estimatedUnitPriceMinor,
      currency: DRAFT_ITEM.currency,
      available: true,
    };

    seedDraft(userA, { [persistedItem.productId]: persistedItem });
    expect(sessionStorage.getItem(storageKey(userA))).not.toBeNull();

    useOrderCartStore.getState().bindSession(userA);
    expect(
      useOrderCartStore.getState().draftItems[persistedItem.productId]?.quantity,
    ).toBe(2);
    expect(useOrderCartStore.getState().ownerUserId).toBe(userA);

    useOrderCartStore.setState({
      ownerUserId: null,
      draftItems: {},
      dialogOpen: false,
    });

    useOrderCartStore.getState().bindSession(userA);
    expect(
      useOrderCartStore.getState().draftItems[persistedItem.productId]?.quantity,
    ).toBe(2);

    useOrderCartStore.setState({
      ownerUserId: null,
      draftItems: {},
      dialogOpen: false,
    });

    useOrderCartStore.getState().bindSession(userB);
    expect(useOrderCartStore.getState().draftItems).toEqual({});
    expect(useOrderCartStore.getState().ownerUserId).toBe(userB);
  });

  test("does not persist or hydrate the selected family id", () => {
    const userId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

    useOrderCartStore.getState().bindSession(userId);
    const state = useOrderCartStore.getState();
    expect(Object.keys(state)).not.toContain("selectedFamilyId");
    expect(Object.keys(state.draftItems).length).toBe(0);

    const persisted = sessionStorage.getItem(storageKey(userId));
    if (persisted) {
      expect(persisted).not.toContain("selectedFamilyId");
      expect(persisted).not.toContain("familyProfileId");
    }
  });
});
