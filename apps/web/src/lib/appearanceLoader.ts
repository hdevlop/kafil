import type { NajmDesignConfig } from "najm-kit";

import themeJson from "../../../../theme.json";
import type { PublicAppearance } from "@/types/appearance";

const APPEARANCE_PATH = "/api/appearance";
const factoryDesign = themeJson as NajmDesignConfig;

export const DEFAULT_APPEARANCE_REVISION = 1;

export function getFactoryDesignConfig(): NajmDesignConfig {
  return structuredClone(factoryDesign);
}

interface AppearanceEnvelope {
  data?: PublicAppearance;
}

export type ServerAppearanceFetcher = (
  path: string,
) => Promise<Response>;

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

function factoryAppearance(): PublicAppearance {
  return {
    designConfig: getFactoryDesignConfig(),
    revision: DEFAULT_APPEARANCE_REVISION,
  };
}

// Imported lazily so the factory/loader half of this file stays usable without
// booting the server (unit tests, and anything outside a request).
export async function loadServerAppearance(): Promise<PublicAppearance> {
  const { server } = await import("@kafil/server");
  return loadAppearanceWith(async (path) =>
    server.fetch(new Request(`http://internal${path}`)),
  );
}
