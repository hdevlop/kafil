"use client";

import { useCallback, useMemo, useReducer } from "react";
import type { NajmDesignConfig } from "najm-kit";

import { useAppearanceCommands } from "@/hooks/useAppearance";
import type {
  PublicAppearance,
  ResetAppearanceInput,
  UpdateAppearanceInput,
} from "@/types/appearance";

import {
  appearanceReducer,
  createInitialAppearanceState,
  selectResolvedDesign,
} from "./appearanceReducer";

export interface KafilAppearanceContextValue {
  appearance: PublicAppearance;
  design: NajmDesignConfig;
  draft: NajmDesignConfig | null;
  hasDraft: boolean;
  beginDraft: () => void;
  setDraft: (design: NajmDesignConfig) => void;
  cancelDraft: () => void;
  commitDraft: (input: UpdateAppearanceInput) => Promise<PublicAppearance>;
  resetToFactory: (input: ResetAppearanceInput) => Promise<PublicAppearance>;
  /**
   * Adopts an appearance the server already committed, for commands that write
   * the theme outside the draft flow (applying a saved theme preset).
   */
  replaceCommitted: (appearance: PublicAppearance) => void;
}

/**
 * The theme editor's draft/commit state.
 *
 * A hook rather than a provider: `design` has to be an ordinary value in the
 * component that mounts the design context, or that component ends up below a
 * provider it needs to read and the bridge comes back.
 */
export function useAppearanceState(
  initialAppearance: PublicAppearance,
): KafilAppearanceContextValue {
  const [state, dispatch] = useReducer(
    appearanceReducer,
    initialAppearance,
    createInitialAppearanceState,
  );
  const { updateAppearance, resetAppearance } = useAppearanceCommands();

  const beginDraft = useCallback(() => {
    dispatch({ type: "begin_draft" });
  }, []);

  const setDraft = useCallback((design: NajmDesignConfig) => {
    dispatch({ type: "update_draft", design });
  }, []);

  const cancelDraft = useCallback(() => {
    dispatch({ type: "clear_draft" });
  }, []);

  const commitDraft = useCallback(
    async (input: UpdateAppearanceInput) => {
      const next = await updateAppearance.mutateAsync(input);
      dispatch({ type: "replace_committed", appearance: next });
      return next;
    },
    [updateAppearance],
  );

  const resetToFactory = useCallback(
    async (input: ResetAppearanceInput) => {
      const next = await resetAppearance.mutateAsync(input);
      dispatch({ type: "replace_committed", appearance: next });
      return next;
    },
    [resetAppearance],
  );

  const replaceCommitted = useCallback((appearance: PublicAppearance) => {
    dispatch({ type: "replace_committed", appearance });
  }, []);

  return useMemo(
    () => ({
      appearance: state.committed,
      design: selectResolvedDesign(state),
      draft: state.draft,
      hasDraft: state.draft !== null,
      beginDraft,
      setDraft,
      cancelDraft,
      commitDraft,
      resetToFactory,
      replaceCommitted,
    }),
    [
      state,
      beginDraft,
      setDraft,
      cancelDraft,
      commitDraft,
      resetToFactory,
      replaceCommitted,
    ],
  );
}
