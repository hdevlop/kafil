"use client";

import { useCallback, useSyncExternalStore } from "react";

const DESKTOP_TABLE_QUERY = "(min-width: 1024px)";
const CARD_VIEWPORT_QUERY = "(max-width: 1023px)";

/**
 * `matchMedia` answers synchronously, so the answer belongs in the render that
 * asks for it. Holding it in state and filling it from an effect makes every
 * mount paint one frame of the wrong viewport: on a desktop table page that
 * frame renders the card skeleton, which is then torn down for the table
 * skeleton, so a single load appears to load twice.
 *
 * `useSyncExternalStore` still uses the server snapshot for SSR and for the
 * hydration render — nothing can be measured before the document exists — but
 * every render after that, including every client-side navigation, reads the
 * live value on the first pass.
 */
function useMediaQuery(query: string, serverSnapshot: boolean) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onStoreChange);
      return () => media.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverSnapshot,
  );
}

export function useDesktopTableMode(): "table" | "cards" {
  return useMediaQuery(DESKTOP_TABLE_QUERY, false) ? "table" : "cards";
}

export function useCardViewport() {
  return useMediaQuery(CARD_VIEWPORT_QUERY, false);
}
