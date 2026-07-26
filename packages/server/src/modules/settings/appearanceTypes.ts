import type { NajmDesignConfig } from "najm-kit";

export type AppearanceDesignConfig = NajmDesignConfig;

export interface PublicAppearance {
  designConfig: NajmDesignConfig;
  revision: number;
}
