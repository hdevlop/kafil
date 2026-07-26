import type { NajmDesignConfig } from "najm-kit";

import type { PublicAppearance } from "@/types/appearance";

export interface AppearanceState {
  committed: PublicAppearance;
  draft: NajmDesignConfig | null;
}

export type AppearanceAction =
  | { type: "replace_committed"; appearance: PublicAppearance }
  | { type: "begin_draft" }
  | { type: "update_draft"; design: NajmDesignConfig }
  | { type: "clear_draft" };

function cloneDesign(design: NajmDesignConfig): NajmDesignConfig {
  return structuredClone(design);
}

export function createInitialAppearanceState(
  appearance: PublicAppearance,
): AppearanceState {
  return { committed: appearance, draft: null };
}

export function appearanceReducer(
  state: AppearanceState,
  action: AppearanceAction,
): AppearanceState {
  switch (action.type) {
    case "replace_committed":
      return {
        committed: action.appearance,
        draft: null,
      };
    case "begin_draft": {
      if (state.draft) return state;
      return { ...state, draft: cloneDesign(state.committed.designConfig) };
    }
    case "update_draft":
      return { ...state, draft: cloneDesign(action.design) };
    case "clear_draft":
      if (state.draft === null) return state;
      return { ...state, draft: null };
    default:
      return state;
  }
}

export function selectResolvedDesign(state: AppearanceState): NajmDesignConfig {
  return state.draft ?? state.committed.designConfig;
}
