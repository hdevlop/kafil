import { getFactoryBranding } from "@kafil/server/branding";
import type { NajmDesignConfig } from "najm-kit";

import themeJson from "../../../../theme.json";
import type { PublicAppearance } from "@/types/appearance";
import type { PublicBranding } from "@/types/branding";

export type ServerBrandingFetcher = (path: string) => Promise<Response>;
export type ServerAppearanceFetcher = (path: string) => Promise<Response>;

const BRANDING_PATH = "/api/branding";
const APPEARANCE_PATH = "/api/appearance";

const factoryDesign = themeJson as NajmDesignConfig;

export const DEFAULT_APPEARANCE_REVISION = 1;

export function getFactoryDesignConfig(): NajmDesignConfig {
  return structuredClone(factoryDesign);
}

function factoryAppearance(): PublicAppearance {
  return {
    designConfig: getFactoryDesignConfig(),
    revision: DEFAULT_APPEARANCE_REVISION,
  };
}

interface BrandingEnvelope {
  data?: PublicBranding;
}

interface AppearanceEnvelope {
  data?: PublicAppearance;
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

export async function loadAppearanceWith(
  fetcher: ServerAppearanceFetcher,
): Promise<PublicAppearance> {
  try {
    const response = await fetcher(APPEARANCE_PATH);
    if (!response.ok) {
      console.warn(
        `[appearance] server load returned ${response.status}; using factory theme`,
      );
      return factoryAppearance();
    }
    const payload = (await response.json()) as AppearanceEnvelope;
    if (!payload.data || typeof payload.data.revision !== "number") {
      console.warn(
        "[appearance] server load returned an invalid payload; using factory theme",
      );
      return factoryAppearance();
    }
    return payload.data;
  } catch (error) {
    console.warn(
      "[appearance] server load failed; using factory theme",
      error,
    );
    return factoryAppearance();
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

export async function loadServerAppearance(): Promise<PublicAppearance> {
  const { server } = await import("@kafil/server");
  return loadAppearanceWith(async (path) =>
    server.fetch(new Request(`http://internal${path}`)),
  );
}
