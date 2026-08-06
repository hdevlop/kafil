"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
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

interface KafilAppearanceContextValue {
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

const KafilAppearanceContext = createContext<KafilAppearanceContextValue | null>(
  null,
);

export function KafilAppearanceProvider({
  children,
  initialAppearance,
}: Readonly<{
  children: ReactNode;
  initialAppearance: PublicAppearance;
}>) {
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

  const value = useMemo<KafilAppearanceContextValue>(
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

  return (
    <KafilAppearanceContext.Provider value={value}>
      {children}
    </KafilAppearanceContext.Provider>
  );
}

export function useKafilAppearance() {
  const context = useContext(KafilAppearanceContext);
  if (!context) {
    throw new Error(
      "useKafilAppearance must be used within KafilAppearanceProvider.",
    );
  }
  return context;
}
