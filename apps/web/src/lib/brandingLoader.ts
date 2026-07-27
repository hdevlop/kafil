import { getFactoryPublicBranding } from "@/lib/brandingFactory";
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
      return getFactoryPublicBranding();
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
      return getFactoryPublicBranding();
    }
    return payload.data;
  } catch (error) {
    console.warn("[branding] server load failed; using factory assets", error);
    return getFactoryPublicBranding();
  }
}
