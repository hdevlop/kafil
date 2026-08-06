import type { NajmDesignConfig } from "najm-kit";

export interface ThemePreset {
  id: string;
  slug: string;
  name: string;
  designConfig: NajmDesignConfig;
  isBuiltIn: boolean;
  createdAt: string;
}

export interface CreateThemePresetInput {
  name: string;
  designConfig: NajmDesignConfig;
}

export interface ApplyThemePresetInput {
  id: string;
  expectedRevision: number;
}
