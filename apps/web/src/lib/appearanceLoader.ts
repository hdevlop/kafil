import {
  DEFAULT_APPEARANCE_REVISION,
  getFactoryDesignConfig,
} from "@/lib/factoryDesign";
import type { PublicAppearance } from "@/types/appearance";

const APPEARANCE_PATH = "/api/appearance";

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
