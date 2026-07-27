import type {
  AdminBrandingConfig,
  BrandingCustomPaths,
  BrandingDraft,
  PublicBranding,
} from "@/types/branding";

export interface BrandingState {
  committed: AdminBrandingConfig;
  draft: BrandingDraft | null;
  orphanCandidates: string[];
}

export type BrandingAction =
  | { type: "replace_committed"; config: AdminBrandingConfig }
  | { type: "begin_draft"; initial: BrandingDraft }
  | { type: "update_slot"; slot: keyof BrandingDraft; value: string | null }
  | { type: "clear_draft" }
  | { type: "revert_slot"; slot: keyof BrandingDraft }
  | { type: "revert_all" }
  | { type: "mark_orphan_candidate"; path: string }
  | { type: "clear_orphan_candidates" };

export function createInitialBrandingState(
  config: AdminBrandingConfig,
): BrandingState {
  return { committed: config, draft: null, orphanCandidates: [] };
}

function cloneCustomPaths(paths: BrandingCustomPaths): BrandingDraft {
  return {
    sidebarLogoExpandedPath: paths.sidebarLogoExpandedPath,
    sidebarLogoCollapsedPath: paths.sidebarLogoCollapsedPath,
    authLogoPath: paths.authLogoPath,
    authHeroImagePath: paths.authHeroImagePath,
  };
}

export function brandingReducer(
  state: BrandingState,
  action: BrandingAction,
): BrandingState {
  switch (action.type) {
    case "replace_committed":
      return {
        committed: action.config,
        draft: null,
        orphanCandidates: [],
      };
    case "begin_draft":
      if (state.draft) return state;
      return {
        ...state,
        draft: cloneCustomPaths(state.committed),
      };
    case "update_slot":
      if (!state.draft) return state;
      return {
        ...state,
        draft: { ...state.draft, [action.slot]: action.value },
      };
    case "clear_draft":
      if (state.draft === null && state.orphanCandidates.length === 0) {
        return state;
      }
      return { ...state, draft: null };
    case "revert_slot":
      if (!state.draft) return state;
      return {
        ...state,
        draft: { ...state.draft, [action.slot]: state.committed[action.slot] },
      };
    case "revert_all":
      if (!state.draft) return state;
      return {
        ...state,
        draft: cloneCustomPaths(state.committed),
      };
    case "mark_orphan_candidate":
      if (state.orphanCandidates.includes(action.path)) return state;
      return {
        ...state,
        orphanCandidates: [...state.orphanCandidates, action.path],
      };
    case "clear_orphan_candidates":
      if (state.orphanCandidates.length === 0) return state;
      return { ...state, orphanCandidates: [] };
    default:
      return state;
  }
}

export function selectResolvedBranding(
  state: BrandingState,
): PublicBranding {
  return state.committed.resolved;
}

export function isBrandingDraftDirty(state: BrandingState): boolean {
  if (!state.draft) return false;
  return (
    state.draft.sidebarLogoExpandedPath !==
      state.committed.sidebarLogoExpandedPath ||
    state.draft.sidebarLogoCollapsedPath !==
      state.committed.sidebarLogoCollapsedPath ||
    state.draft.authLogoPath !== state.committed.authLogoPath ||
    state.draft.authHeroImagePath !== state.committed.authHeroImagePath
  );
}

export function initialBrandingDraft(
  config: AdminBrandingConfig,
): BrandingDraft {
  return cloneCustomPaths(config);
}

export function findOrphanCandidates(
  state: BrandingState,
  isManagedUpload: (path: string) => boolean,
): string[] {
  if (!state.draft) return state.orphanCandidates;
  const draft = state.draft;
  const committed = state.committed;
  const result: string[] = [];
  const slots: (keyof BrandingDraft)[] = [
    "sidebarLogoExpandedPath",
    "sidebarLogoCollapsedPath",
    "authLogoPath",
    "authHeroImagePath",
  ];
  for (const slot of slots) {
    const draftValue = draft[slot];
    const committedValue = committed[slot];
    if (
      draftValue &&
      draftValue !== committedValue &&
      isManagedUpload(draftValue) &&
      !state.orphanCandidates.includes(draftValue)
    ) {
      result.push(draftValue);
    }
  }
  return [...state.orphanCandidates, ...result];
}
