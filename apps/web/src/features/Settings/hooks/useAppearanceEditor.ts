"use client";

import { useCallback } from "react";
import { useNajmDesignEditor, type NajmDesignConfig } from "najm-kit";

import {
  useAppearanceCommands,
  usePublicAppearance,
} from "@/hooks/useAppearance";
import type { PublicAppearance } from "@/types/appearance";

/**
 * The half of the theme editor `najm-kit` has no business owning.
 *
 * The draft is the kit's: `useNajmDesignEditor` holds begin/set/cancel and
 * re-renders the whole app as the draft moves, which is why this is a feature
 * hook and not a provider at the root. What is left here is the revision each
 * save is based on, and the endpoints behind it.
 *
 * The revision is fetched rather than seeded from the server render: it is only
 * needed at save time, it must be the *current* one to be worth checking, and
 * threading it down from the layout was the last thing keeping appearance in a
 * provider.
 */
export function useAppearanceEditor(enabled: boolean) {
  // Non-null because the settings sheet only renders inside `NajmAppProvider`,
  // which always mounts the editor.
  const design = useNajmDesignEditor()!;
  const { data } = usePublicAppearance(enabled);
  const { updateAppearance, resetAppearance } = useAppearanceCommands();

  const revision = data?.revision;

  const adopt = useCallback(
    (appearance: PublicAppearance) => {
      design.setCommitted(appearance.designConfig);
    },
    [design],
  );

  const save = useCallback(
    async (designConfig: NajmDesignConfig, expectedRevision: number) => {
      const next = await updateAppearance.mutateAsync({
        designConfig,
        expectedRevision,
      });
      adopt(next);
      return next;
    },
    [adopt, updateAppearance],
  );

  const resetToFactory = useCallback(
    async (expectedRevision: number) => {
      const next = await resetAppearance.mutateAsync({ expectedRevision });
      adopt(next);
      return next;
    },
    [adopt, resetAppearance],
  );

  return { design, revision, adopt, save, resetToFactory };
}
