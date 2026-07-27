import { cookies } from "next/headers";
import { server } from "@kafil/server";

import { getFactoryPublicBranding } from "@/lib/brandingFactory";
import type { AdminBrandingConfig, PublicBranding } from "@/types/branding";

export type ServerBrandingAdminFetcher = (
  path: string,
) => Promise<Response>;

const BRANDING_CONFIG_PATH = "/api/branding/config";
const BRANDING_PATH = "/api/branding";

const FALLBACK_PUBLIC: PublicBranding = getFactoryPublicBranding();
const FALLBACK_CONFIG: AdminBrandingConfig = {
  sidebarLogoExpandedPath: null,
  sidebarLogoCollapsedPath: null,
  authLogoPath: null,
  authHeroImagePath: null,
  resolved: FALLBACK_PUBLIC,
  revision: 1,
};

interface BrandingEnvelope {
  data?: PublicBranding;
}

interface BrandingConfigEnvelope {
  data?: AdminBrandingConfig;
}

function projectPublicAsConfig(publicBranding: PublicBranding): AdminBrandingConfig {
  return {
    sidebarLogoExpandedPath: null,
    sidebarLogoCollapsedPath: null,
    authLogoPath: null,
    authHeroImagePath: null,
    resolved: publicBranding,
    revision: publicBranding.revision,
  };
}

export async function loadBrandingConfigWith(
  fetcher: ServerBrandingAdminFetcher,
): Promise<AdminBrandingConfig> {
  try {
    const response = await fetcher(BRANDING_CONFIG_PATH);
    if (!response.ok) {
      console.warn(
        `[branding] admin config load returned ${response.status}; using fallback configuration`,
      );
      return FALLBACK_CONFIG;
    }
    const payload = (await response.json()) as BrandingConfigEnvelope;
    if (
      !payload.data ||
      typeof payload.data.revision !== "number" ||
      !payload.data.resolved
    ) {
      console.warn(
        "[branding] admin config load returned an invalid payload; using fallback configuration",
      );
      return FALLBACK_CONFIG;
    }
    return payload.data;
  } catch (error) {
    console.warn(
      "[branding] admin config load failed; using fallback configuration",
      error,
    );
    return FALLBACK_CONFIG;
  }
}

export async function loadServerBrandingConfigAsPublic(
  fetcher: ServerBrandingAdminFetcher,
): Promise<AdminBrandingConfig> {
  try {
    const response = await fetcher(BRANDING_PATH);
    if (!response.ok) {
      console.warn(
        `[branding] public config load returned ${response.status}; using factory assets`,
      );
      return FALLBACK_CONFIG;
    }
    const payload = (await response.json()) as BrandingEnvelope;
    if (!payload.data || typeof payload.data.revision !== "number") {
      console.warn(
        "[branding] public config load returned an invalid payload; using factory assets",
      );
      return FALLBACK_CONFIG;
    }
    return projectPublicAsConfig(payload.data);
  } catch (error) {
    console.warn(
      "[branding] public config load failed; using factory assets",
      error,
    );
    return FALLBACK_CONFIG;
  }
}

export async function loadServerBrandingConfig(): Promise<AdminBrandingConfig> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((entry) => `${entry.name}=${entry.value}`)
    .join("; ");

  if (!cookieHeader) {
    console.warn(
      "[branding] no session cookie forwarded to the server; using factory assets",
    );
    return loadServerBrandingConfigAsPublic(async (path) =>
      server.fetch(new Request(`http://internal${path}`)),
    );
  }

  return loadBrandingConfigWith(async (path) =>
    server.fetch(
      new Request(`http://internal${path}`, {
        headers: { cookie: cookieHeader },
      }),
    ),
  );
}
