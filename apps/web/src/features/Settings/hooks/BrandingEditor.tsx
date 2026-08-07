"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNBrandingEditor } from "najm-kit";

import { useBrandingConfig } from "@/hooks/useBranding";
import { deleteBrandingCandidates, updateBranding } from "@/services/brandingApi";
import { BRANDING_ASSET_ROUTE_PREFIX } from "@/types/branding";
import type {
  AdminBrandingConfig,
  BrandingDraft,
  PublicBranding,
} from "@/types/branding";

export interface BrandingEditorValue {
  isAdmin: boolean;
  config: AdminBrandingConfig | undefined;
  resolved: PublicBranding | undefined;
  draft: BrandingDraft | null;
  isDirty: boolean;
  beginDraft: () => void;
  setSlot: (slot: keyof BrandingDraft, value: string | null) => void;
  clearSlot: (slot: keyof BrandingDraft) => void;
  revertSlot: (slot: keyof BrandingDraft) => void;
  revertAll: () => void;
  cancelDraft: () => Promise<void>;
  commitDraft: () => Promise<void>;
}

const SLOTS: (keyof BrandingDraft)[] = [
  "sidebarLogoExpandedPath",
  "sidebarLogoCollapsedPath",
  "authLogoPath",
  "authHeroImagePath",
];

const BrandingEditorContext = createContext<BrandingEditorValue | null>(null);

/**
 * Branding asset editing, scoped to the settings sheet that mounts it.
 *
 * A context and not a hook because `AppSettingsPanel` saves the draft that
 * `BrandAssetsPanel` builds — but a *feature* context, mounted where it is
 * used. The marks the app displays are not in here: those belong to
 * `NajmAppProvider`, and a commit pushes the new logos at it so the sidebar
 * changes without a reload.
 */
export function BrandingEditorProvider({
  children,
  enabled,
  role,
}: Readonly<{ children: ReactNode; enabled: boolean; role?: string | null }>) {
  const isAdmin = role === "admin";
  const { data: config, refetch } = useBrandingConfig(enabled && isAdmin);
  const kit = useNBrandingEditor();
  const [draft, setDraft] = useState<BrandingDraft | null>(null);
  const [orphans, setOrphans] = useState<string[]>([]);

  const beginDraft = useCallback(() => {
    if (!isAdmin || !config) return;
    setDraft((current) => current ?? pickSlots(config));
  }, [config, isAdmin]);

  const setSlot = useCallback(
    (slot: keyof BrandingDraft, value: string | null) => {
      if (!isAdmin) return;
      setDraft((current) => (current ? { ...current, [slot]: value } : current));
      if (value && isManagedUpload(value)) {
        setOrphans((current) =>
          current.includes(value) ? current : [...current, value],
        );
      }
    },
    [isAdmin],
  );

  const clearSlot = useCallback(
    (slot: keyof BrandingDraft) => setSlot(slot, null),
    [setSlot],
  );

  const revertSlot = useCallback(
    (slot: keyof BrandingDraft) => {
      if (!isAdmin || !config) return;
      setDraft((current) =>
        current ? { ...current, [slot]: config[slot] } : current,
      );
    },
    [config, isAdmin],
  );

  const revertAll = useCallback(() => {
    if (!isAdmin || !config) return;
    setDraft((current) => (current ? pickSlots(config) : current));
  }, [config, isAdmin]);

  /**
   * Every upload writes a file before the admin has agreed to keep it, so
   * abandoning the draft has to take the files with it. Best effort: the server
   * sees anything missed as unreferenced on the next commit.
   */
  const cancelDraft = useCallback(async () => {
    if (!isAdmin) return;
    const abandoned = config && draft ? orphansIn(draft, config, orphans) : orphans;
    setDraft(null);
    setOrphans([]);
    if (abandoned.length > 0) {
      await deleteBrandingCandidates(abandoned).catch(() => {});
    }
  }, [config, draft, isAdmin, orphans]);

  const commitDraft = useCallback(async () => {
    if (!isAdmin) throw new Error("Branding is read-only for this session");
    if (!draft || !config) throw new Error("No draft to commit");

    const superseded = orphans.filter(
      (path) => !SLOTS.some((slot) => draft[slot] === path),
    );
    const updated = await updateBranding({
      ...draft,
      expectedRevision: config.revision,
    });
    if (superseded.length > 0) {
      await deleteBrandingCandidates(superseded).catch(() => {});
    }

    setOrphans([]);
    // Handed over as-is: the kit reads the sidebar paths off the payload and
    // ignores the auth slots and the revision.
    kit?.setBranding(updated);
    await refetch();
  }, [config, draft, isAdmin, kit, orphans, refetch]);

  const value = useMemo<BrandingEditorValue>(
    () => ({
      isAdmin,
      config,
      resolved: config?.resolved,
      draft,
      isDirty: isBrandingDirty(draft, config),
      beginDraft,
      setSlot,
      clearSlot,
      revertSlot,
      revertAll,
      cancelDraft,
      commitDraft,
    }),
    [
      beginDraft,
      cancelDraft,
      clearSlot,
      commitDraft,
      config,
      draft,
      isAdmin,
      revertAll,
      revertSlot,
      setSlot,
    ],
  );

  return (
    <BrandingEditorContext.Provider value={value}>
      {children}
    </BrandingEditorContext.Provider>
  );
}

export function useBrandingEditor() {
  const context = useContext(BrandingEditorContext);
  if (!context) {
    throw new Error("useBrandingEditor must be used within BrandingEditorProvider.");
  }
  return context;
}

export function isManagedUpload(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(BRANDING_ASSET_ROUTE_PREFIX);
}

export function isBrandingDirty(
  draft: BrandingDraft | null,
  config: AdminBrandingConfig | undefined,
): boolean {
  if (!draft || !config) return false;
  return SLOTS.some((slot) => draft[slot] !== config[slot]);
}

/** The custom paths only — the resolved fallbacks are never editable. */
export function pickSlots(config: AdminBrandingConfig): BrandingDraft {
  return {
    sidebarLogoExpandedPath: config.sidebarLogoExpandedPath,
    sidebarLogoCollapsedPath: config.sidebarLogoCollapsedPath,
    authLogoPath: config.authLogoPath,
    authHeroImagePath: config.authHeroImagePath,
  };
}

/** Uploads the draft points at that the committed config does not. */
export function orphansIn(
  draft: BrandingDraft,
  config: AdminBrandingConfig,
  tracked: string[],
): string[] {
  const found = SLOTS.filter((slot) => {
    const value = draft[slot];
    return (
      Boolean(value) &&
      value !== config[slot] &&
      isManagedUpload(value) &&
      !tracked.includes(value as string)
    );
  }).map((slot) => draft[slot] as string);

  return [...tracked, ...found];
}
