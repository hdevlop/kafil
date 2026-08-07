"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { toast, type NajmDesignConfig } from "najm-kit";
import { NajmAppProvider } from "najm-kit/app";

import { uiTranslations } from "@/i18n/translations";
import {
  normalizeKafilTimeZone,
  type KafilLanguage,
  type KafilTheme,
  type KafilTimeZone,
} from "@/lib/format";
import { useAppearanceCommands } from "@/hooks/useAppearance";
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
import {
  brandingReducer,
  createInitialBrandingState,
  findOrphanCandidates,
  initialBrandingDraft,
  isBrandingDraftDirty,
} from "./brandingReducer";

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

const KafilAppearanceContext = createContext<KafilAppearanceContextValue | null>(
  null,
);
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

/**
 * Kafil's whole UI layer, as one component.
 *
 * This used to be four nested providers, and the nesting was not a style
 * choice: each one existed to *read* the context the one above it published,
 * and the design consumer could not sit in the same component as the appearance
 * state that produced it. Holding both reducers here makes `design` and the
 * resolved branding ordinary local values, so the contexts below are bare
 * `.Provider` wrappers with no logic and nothing left to bridge.
 *
 * Everything generic — language, theme, time zone, the design context, branding
 * display, `NTable` defaults — comes from `NajmAppProvider`. What stays here is
 * only what Kafil actually owns: the draft/commit editing model for appearance
 * and branding, which is a product feature with a server module behind it, not
 * provider glue. An application without a theme editor mounts `NajmAppProvider`
 * directly and writes none of this.
 */
export function KafilUIProvider({
  children,
  initialAppearance,
  initialBrandingConfig,
  initialBrandingResolved,
  initialLanguage,
  initialTheme,
  initialTimeZone,
  role,
}: Readonly<{
  children: ReactNode;
  initialAppearance: PublicAppearance;
  initialBrandingConfig: AdminBrandingConfig;
  initialBrandingResolved: PublicBranding;
  initialLanguage: KafilLanguage;
  initialTheme: KafilTheme;
  initialTimeZone: KafilTimeZone;
  role?: string | null;
}>) {
  const isAdmin = role === "admin";

  const [appearanceState, appearanceDispatch] = useReducer(
    appearanceReducer,
    initialAppearance,
    createInitialAppearanceState,
  );
  const [brandingState, brandingDispatch] = useReducer(
    brandingReducer,
    initialBrandingConfig,
    createInitialBrandingState,
  );
  const { updateAppearance, resetAppearance } = useAppearanceCommands();

  const design = selectResolvedDesign(appearanceState);
  const resolvedBranding = isAdmin
    ? brandingState.committed.resolved
    : initialBrandingResolved;

  const beginAppearanceDraft = useCallback(() => {
    appearanceDispatch({ type: "begin_draft" });
  }, []);

  const setAppearanceDraft = useCallback((next: NajmDesignConfig) => {
    appearanceDispatch({ type: "update_draft", design: next });
  }, []);

  const cancelAppearanceDraft = useCallback(() => {
    appearanceDispatch({ type: "clear_draft" });
  }, []);

  const commitAppearanceDraft = useCallback(
    async (input: UpdateAppearanceInput) => {
      const next = await updateAppearance.mutateAsync(input);
      appearanceDispatch({ type: "replace_committed", appearance: next });
      return next;
    },
    [updateAppearance],
  );

  const resetAppearanceToFactory = useCallback(
    async (input: ResetAppearanceInput) => {
      const next = await resetAppearance.mutateAsync(input);
      appearanceDispatch({ type: "replace_committed", appearance: next });
      return next;
    },
    [resetAppearance],
  );

  const replaceCommittedAppearance = useCallback(
    (appearance: PublicAppearance) => {
      appearanceDispatch({ type: "replace_committed", appearance });
    },
    [],
  );

  const appearanceValue = useMemo<KafilAppearanceContextValue>(
    () => ({
      appearance: appearanceState.committed,
      design,
      draft: appearanceState.draft,
      hasDraft: appearanceState.draft !== null,
      beginDraft: beginAppearanceDraft,
      setDraft: setAppearanceDraft,
      cancelDraft: cancelAppearanceDraft,
      commitDraft: commitAppearanceDraft,
      resetToFactory: resetAppearanceToFactory,
      replaceCommitted: replaceCommittedAppearance,
    }),
    [
      appearanceState,
      design,
      beginAppearanceDraft,
      setAppearanceDraft,
      cancelAppearanceDraft,
      commitAppearanceDraft,
      resetAppearanceToFactory,
      replaceCommittedAppearance,
    ],
  );

  const refreshBranding = useCallback(async () => {
    if (!isAdmin) return undefined;
    const config = await getBrandingConfig();
    brandingDispatch({ type: "replace_committed", config });
    return config;
  }, [isAdmin]);

  const beginBrandingDraft = useCallback(() => {
    if (!isAdmin) return;
    brandingDispatch({
      type: "begin_draft",
      initial: initialBrandingDraft(brandingState.committed),
    });
  }, [isAdmin, brandingState.committed]);

  const setSlot = useCallback(
    (slot: keyof BrandingDraft, value: string | null) => {
      if (!isAdmin) return;
      brandingDispatch({ type: "update_slot", slot, value });
      if (value && isManagedUploadPath(value)) {
        brandingDispatch({ type: "mark_orphan_candidate", path: value });
      }
    },
    [isAdmin],
  );

  const clearSlot = useCallback(
    (slot: keyof BrandingDraft) => {
      if (!isAdmin) return;
      brandingDispatch({ type: "update_slot", slot, value: null });
    },
    [isAdmin],
  );

  const revertSlot = useCallback(
    (slot: keyof BrandingDraft) => {
      if (!isAdmin) return;
      brandingDispatch({ type: "revert_slot", slot });
    },
    [isAdmin],
  );

  const revertAll = useCallback(() => {
    if (!isAdmin) return;
    brandingDispatch({ type: "revert_all" });
  }, [isAdmin]);

  const cancelBrandingDraft = useCallback(async () => {
    if (!isAdmin) return;
    const orphans = findOrphanCandidates(brandingState, isManagedUploadPath);
    brandingDispatch({ type: "clear_draft" });
    if (orphans.length > 0) {
      try {
        await deleteBrandingCandidates(orphans);
      } catch {
        // best effort
      }
    }
    brandingDispatch({ type: "clear_orphan_candidates" });
  }, [isAdmin, brandingState]);

  const commitBrandingDraft = useCallback(async () => {
    if (!isAdmin) throw new Error("Branding is read-only for this session");
    if (!brandingState.draft) {
      throw new Error("No draft to commit");
    }
    const draftSnapshot = brandingState.draft;
    const orphansBefore = brandingState.orphanCandidates;
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
      expectedRevision: brandingState.committed.revision,
    });
    if (supersededOrphans.length > 0) {
      try {
        await deleteBrandingCandidates(supersededOrphans);
      } catch {
        // best effort; server will see them as unreferenced on next commit
      }
    }
    const next = projectAdminConfig(updated, draftSnapshot, updated.revision);
    brandingDispatch({ type: "replace_committed", config: next });
    return next;
  }, [
    isAdmin,
    brandingState.committed,
    brandingState.draft,
    brandingState.orphanCandidates,
  ]);

  const resetBrandingToFactory = useCallback(async () => {
    if (!isAdmin) throw new Error("Branding is read-only for this session");
    const orphansBefore = brandingState.orphanCandidates;
    await resetBrandingApi({
      expectedRevision: brandingState.committed.revision,
    });
    if (orphansBefore.length > 0) {
      try {
        await deleteBrandingCandidates(orphansBefore);
      } catch {
        // best effort; server still cleans up the previously committed files
      }
    }
    const fresh = await getBrandingConfig();
    brandingDispatch({ type: "replace_committed", config: fresh });
    return fresh;
  }, [isAdmin, brandingState.committed, brandingState.orphanCandidates]);

  const deleteCandidateAsset = useCallback(
    async (path: string) => {
      if (!isAdmin) return;
      try {
        await deleteBrandingAsset(path);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not discard the asset.",
        );
      }
    },
    [isAdmin],
  );

  const brandingValue = useMemo<KafilBrandingContextValue>(
    () => ({
      isAdmin,
      config: brandingState.committed,
      resolved: resolvedBranding,
      draft: brandingState.draft,
      orphanCandidates: brandingState.orphanCandidates,
      hasDraft: brandingState.draft !== null,
      isDirty: isBrandingDraftDirty(brandingState),
      beginDraft: beginBrandingDraft,
      setSlot,
      clearSlot,
      revertSlot,
      revertAll,
      cancelDraft: cancelBrandingDraft,
      commitDraft: commitBrandingDraft,
      resetToFactory: resetBrandingToFactory,
      deleteCandidateAsset,
      refresh: refreshBranding,
    }),
    [
      isAdmin,
      resolvedBranding,
      brandingState,
      beginBrandingDraft,
      setSlot,
      clearSlot,
      revertSlot,
      revertAll,
      cancelBrandingDraft,
      commitBrandingDraft,
      resetBrandingToFactory,
      deleteCandidateAsset,
      refreshBranding,
    ],
  );

  const branding = useMemo(
    () => ({
      appName: APP_NAME,
      logoExpanded: resolvedBranding.sidebarLogoExpandedPath,
      logoCollapsed: resolvedBranding.sidebarLogoCollapsedPath,
    }),
    [resolvedBranding],
  );

  return (
    <KafilAppearanceContext.Provider value={appearanceValue}>
      <KafilBrandingContext.Provider value={brandingValue}>
        <NajmAppProvider
          branding={branding}
          className="min-h-full"
          design={design}
          initialLanguage={initialLanguage}
          initialTheme={initialTheme}
          initialTimeZone={initialTimeZone}
          normalizeTimeZone={normalizeKafilTimeZone}
          translations={uiTranslations}
        >
          {children}
        </NajmAppProvider>
      </KafilBrandingContext.Provider>
    </KafilAppearanceContext.Provider>
  );
}

export function useKafilAppearance() {
  const context = useContext(KafilAppearanceContext);
  if (!context) {
    throw new Error("useKafilAppearance must be used within KafilUIProvider.");
  }
  return context;
}

export function useKafilBranding() {
  const context = useContext(KafilBrandingContext);
  if (!context) {
    throw new Error("useKafilBranding must be used within KafilUIProvider.");
  }
  return context;
}

export type { AdminBrandingConfig, BrandingCustomPaths, BrandingDraft };
