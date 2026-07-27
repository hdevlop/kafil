"use client";

import { useEntityCommand } from "@/hooks/useEntityCommand";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import {
  deleteBrandingAsset,
  getBranding,
  resetBranding,
  updateBranding,
  uploadBrandingAsset,
} from "@/services/brandingApi";
import type {
  PublicBranding,
  ResetBrandingInput,
  UpdateBrandingInput,
  UploadBrandingAssetResult,
} from "@/types/branding";

import { brandingKeys } from "./brandingKeys";

export function usePublicBranding() {
  return useEntityQuery<PublicBranding>({
    queryKey: brandingKeys.current,
    queryFn: getBranding,
    staleTime: 60_000,
  });
}

export function useBrandingCommands() {
  return {
    updateBranding: useEntityCommand<PublicBranding, UpdateBrandingInput>({
      mutationFn: updateBranding,
      invalidate: [brandingKeys.all],
    }),
    resetBranding: useEntityCommand<PublicBranding, ResetBrandingInput>({
      mutationFn: resetBranding,
      invalidate: [brandingKeys.all],
    }),
    uploadBrandingAsset: useEntityCommand<
      UploadBrandingAssetResult,
      { slot: string; file: File }
    >({
      mutationFn: uploadBrandingAsset,
    }),
    deleteBrandingAsset: useEntityCommand<
      { deleted: boolean; referenced: boolean },
      string
    >({
      mutationFn: deleteBrandingAsset,
    }),
  };
}
