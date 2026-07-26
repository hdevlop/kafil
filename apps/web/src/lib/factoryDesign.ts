import type { NajmDesignConfig } from "najm-kit";

import themeJson from "../../../../theme.json";

const factoryDesign = themeJson as NajmDesignConfig;

export function getFactoryDesignConfig(): NajmDesignConfig {
  return structuredClone(factoryDesign);
}

export const DEFAULT_APPEARANCE_REVISION = 1;
