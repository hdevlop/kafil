"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { NBrandingProvider, toast } from "najm-kit";

import {
  deleteBrandingCandidates,
  deleteBrandingAsset,
  getBrandingConfig,
  resetBranding as resetBrandingApi,
  updateBranding,
} from "@/services/brandingApi";
import { APP_NAME, BRANDING_ASSET_ROUTE_PREFIX } from "@/types/branding";
import type {
  AdminBrandingConfig,
  BrandingCustomPaths,
  BrandingDraft,
  PublicBranding,
} from "@/types/branding";

import {
  brandingReducer,
  createInitialBrandingState,
  findOrphanCandidates,
  initialBrandingDraft,
  isBrandingDraftDirty,
} from "./brandingReducer";

interface KafilBrandingContextValue {
  isAdmin: boolean;
  config: AdminBrandingConfig;
  resolved: PublicBranding;
  draft: BrandingDraft | null;
  orphanCandidates: string[];
  hasDraft: boolean;
  isDirty: boolean;
  beginDraft: () => void;
  setSlot: (slot: keyof BrandingDraft, value: string | null) => void;
  clearSlot: (slot: keyof BrandingDraft) => void;
  revertSlot: (slot: keyof BrandingDraft) => void;
  revertAll: () => void;
  cancelDraft: () => Promise<void>;
  commitDraft: () => Promise<AdminBrandingConfig>;
  resetToFactory: () => Promise<AdminBrandingConfig>;
  deleteCandidateAsset: (path: string) => Promise<void>;
  refresh: () => Promise<AdminBrandingConfig | undefined>;
}

const KafilBrandingContext = createContext<KafilBrandingContextValue | null>(
  null,
);

function projectAdminConfig(
  publicBranding: PublicBranding,
  customPaths: BrandingCustomPaths,
  revision: number,
): AdminBrandingConfig {
  return {
    sidebarLogoExpandedPath: customPaths.sidebarLogoExpandedPath,
    sidebarLogoCollapsedPath: customPaths.sidebarLogoCollapsedPath,
    authLogoPath: customPaths.authLogoPath,
    authHeroImagePath: customPaths.authHeroImagePath,
    resolved: { ...publicBranding, revision },
    revision,
  };
}

function isManagedUploadPath(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(BRANDING_ASSET_ROUTE_PREFIX);
}

export function KafilBrandingProvider({
  children,
  initialConfig,
  initialResolved,
  role,
}: Readonly<{
  children: ReactNode;
  initialConfig: AdminBrandingConfig;
  initialResolved: PublicBranding;
  role?: string | null;
}>) {
  const isAdmin = role === "admin";
  const [state, dispatch] = useReducer(
    brandingReducer,
    initialConfig,
    createInitialBrandingState,
  );
  const resolved = isAdmin ? state.committed.resolved : initialResolved;

  const refresh = useCallback(async () => {
    if (!isAdmin) return undefined;
    const config = await getBrandingConfig();
    dispatch({ type: "replace_committed", config });
    return config;
  }, [isAdmin]);

  const beginDraft = useCallback(() => {
    if (!isAdmin) return;
    dispatch({ type: "begin_draft", initial: initialBrandingDraft(state.committed) });
  }, [isAdmin, state.committed]);

  const setSlot = useCallback(
    (slot: keyof BrandingDraft, value: string | null) => {
      if (!isAdmin) return;
      dispatch({ type: "update_slot", slot, value });
      if (value && isManagedUploadPath(value)) {
        dispatch({ type: "mark_orphan_candidate", path: value });
      }
    },
    [isAdmin],
  );

  const clearSlot = useCallback(
    (slot: keyof BrandingDraft) => {
      if (!isAdmin) return;
      dispatch({ type: "update_slot", slot, value: null });
    },
    [isAdmin],
  );

  const revertSlot = useCallback(
    (slot: keyof BrandingDraft) => {
      if (!isAdmin) return;
      dispatch({ type: "revert_slot", slot });
    },
    [isAdmin],
  );

  const revertAll = useCallback(() => {
    if (!isAdmin) return;
    dispatch({ type: "revert_all" });
  }, [isAdmin]);

  const cancelDraft = useCallback(async () => {
    if (!isAdmin) return;
    const orphans = findOrphanCandidates(state, isManagedUploadPath);
    dispatch({ type: "clear_draft" });
    if (orphans.length > 0) {
      try {
        await deleteBrandingCandidates(orphans);
      } catch {
        // best effort
      }
    }
    dispatch({ type: "clear_orphan_candidates" });
  }, [isAdmin, state]);

  const commitDraft = useCallback(async () => {
    if (!isAdmin) throw new Error("Branding is read-only for this session");
    if (!state.draft) {
      throw new Error("No draft to commit");
    }
    const draftSnapshot = state.draft;
    const orphansBefore = state.orphanCandidates;
    const supersededOrphans = orphansBefore.filter(
      (path) =>
        draftSnapshot.sidebarLogoExpandedPath !== path &&
        draftSnapshot.sidebarLogoCollapsedPath !== path &&
        draftSnapshot.authLogoPath !== path &&
        draftSnapshot.authHeroImagePath !== path,
    );
    const updated = await updateBranding({
      sidebarLogoExpandedPath: draftSnapshot.sidebarLogoExpandedPath,
      sidebarLogoCollapsedPath: draftSnapshot.sidebarLogoCollapsedPath,
      authLogoPath: draftSnapshot.authLogoPath,
      authHeroImagePath: draftSnapshot.authHeroImagePath,
      expectedRevision: state.committed.revision,
    });
    if (supersededOrphans.length > 0) {
      try {
        await deleteBrandingCandidates(supersededOrphans);
      } catch {
        // best effort; server will see them as unreferenced on next commit
      }
    }
    const next = projectAdminConfig(
      updated,
      draftSnapshot,
      updated.revision,
    );
    dispatch({ type: "replace_committed", config: next });
    return next;
  }, [isAdmin, state.committed, state.draft, state.orphanCandidates]);

  const resetToFactory = useCallback(async () => {
    if (!isAdmin) throw new Error("Branding is read-only for this session");
    const orphansBefore = state.orphanCandidates;
    await resetBrandingApi({
      expectedRevision: state.committed.revision,
    });
    if (orphansBefore.length > 0) {
      try {
        await deleteBrandingCandidates(orphansBefore);
      } catch {
        // best effort; server still cleans up the previously committed files
      }
    }
    const fresh = await getBrandingConfig();
    dispatch({ type: "replace_committed", config: fresh });
    return fresh;
  }, [isAdmin, state.committed, state.orphanCandidates]);

  const deleteCandidateAsset = useCallback(async (path: string) => {
    if (!isAdmin) return;
    try {
      await deleteBrandingAsset(path);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not discard the asset.",
      );
    }
  }, [isAdmin]);

  const value = useMemo<KafilBrandingContextValue>(
    () => ({
      isAdmin,
      config: state.committed,
      resolved,
      draft: state.draft,
      orphanCandidates: state.orphanCandidates,
      hasDraft: state.draft !== null,
      isDirty: isBrandingDraftDirty(state),
      beginDraft,
      setSlot,
      clearSlot,
      revertSlot,
      revertAll,
      cancelDraft,
      commitDraft,
      resetToFactory,
      deleteCandidateAsset,
      refresh,
    }),
    [
      isAdmin,
      resolved,
      state,
      beginDraft,
      setSlot,
      clearSlot,
      revertSlot,
      revertAll,
      cancelDraft,
      commitDraft,
      resetToFactory,
      deleteCandidateAsset,
      refresh,
    ],
  );

  return (
    <KafilBrandingContext.Provider value={value}>
      <NBrandingProvider
        appName={APP_NAME}
        logoExpanded={resolved.sidebarLogoExpandedPath}
        logoCollapsed={resolved.sidebarLogoCollapsedPath}
      >
        {children}
      </NBrandingProvider>
    </KafilBrandingContext.Provider>
  );
}

export function useKafilBranding() {
  const context = useContext(KafilBrandingContext);
  if (!context) {
    throw new Error(
      "useKafilBranding must be used within KafilBrandingProvider.",
    );
  }
  return context;
}

export type { AdminBrandingConfig, BrandingCustomPaths, BrandingDraft };
