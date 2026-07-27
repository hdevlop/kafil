import { getFactoryBranding } from "@kafil/server/branding";

import type { PublicBranding } from "@/types/branding";

export function getFactoryPublicBranding(): PublicBranding {
  return getFactoryBranding();
}
