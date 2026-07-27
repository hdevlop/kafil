import { server } from "@kafil/server";

import { loadBrandingWith } from "@/lib/brandingLoader";
import type { PublicBranding } from "@/types/branding";

export async function loadServerBranding(): Promise<PublicBranding> {
  return loadBrandingWith(async (path) =>
    server.fetch(new Request(`http://internal${path}`)),
  );
}
