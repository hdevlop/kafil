import type { NajmDesignConfig } from "najm-kit";

export interface PublicAppearance {
  designConfig: NajmDesignConfig;
  revision: number;
}

export interface UpdateAppearanceInput {
  designConfig: NajmDesignConfig;
  expectedRevision: number;
}

export interface ResetAppearanceInput {
  expectedRevision: number;
}
