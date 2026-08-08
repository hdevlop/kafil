import { getFactoryBranding } from "@kafil/server/branding";
import type { PublicBranding } from "@/types/branding";

export type ServerBrandingFetcher = (path: string) => Promise<Response>;

const BRANDING_PATH = "/api/branding";

interface BrandingEnvelope {
  data?: PublicBranding;
}

export async function loadBrandingWith(
  fetcher: ServerBrandingFetcher,
): Promise<PublicBranding> {
  try {
    const response = await fetcher(BRANDING_PATH);
    if (!response.ok) {
      console.warn(
        `[branding] server load returned ${response.status}; using factory assets`,
      );
      return getFactoryBranding();
    }
    const payload = (await response.json()) as BrandingEnvelope;
    if (
      !payload.data ||
      typeof payload.data.revision !== "number" ||
      typeof payload.data.sidebarLogoExpandedPath !== "string"
    ) {
      console.warn(
        "[branding] server load returned an invalid payload; using factory assets",
      );
      return getFactoryBranding();
    }
    return payload.data;
  } catch (error) {
    console.warn("[branding] server load failed; using factory assets", error);
    return getFactoryBranding();
  }
}

// Imported lazily so the loader half of this file stays usable without booting
// the server (unit tests, and anything outside a request).
export async function loadServerBranding(): Promise<PublicBranding> {
  const { server } = await import("@kafil/server");
  return loadBrandingWith(async (path) =>
    server.fetch(new Request(`http://internal${path}`)),
  );
}
