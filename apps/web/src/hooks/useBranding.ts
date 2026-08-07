"use client";

import { useEntityQuery } from "@/hooks/useEntityQuery";
import { getBrandingConfig } from "@/services/brandingApi";
import type { AdminBrandingConfig } from "@/types/branding";

import { brandingKeys } from "./brandingKeys";

/**
 * The admin view of branding: the custom paths behind each slot, what they
 * resolve to, and the revision a save must be based on.
 *
 * Admin-only on the server, and only the settings sheet needs it — the marks
 * the rest of the app displays come from `NajmAppProvider`, seeded server-side.
 */
export function useBrandingConfig(enabled: boolean) {
  return useEntityQuery<AdminBrandingConfig>({
    queryKey: brandingKeys.config,
    queryFn: getBrandingConfig,
    enabled,
    staleTime: 60_000,
  });
}
