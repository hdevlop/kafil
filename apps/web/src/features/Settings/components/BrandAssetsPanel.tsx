"use client";

import {
  ImageInput,
  NButton,
  NCard,
  toast,
} from "najm-kit";
import { RotateCcw, Undo2 } from "lucide-react";
import { type CSSProperties, useEffect, useState } from "react";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import type { TranslationKey } from "@/i18n/translations";
import { useKafilBranding } from "@/providers/KafilBrandingProvider";
import {
  brandingExtensionForFile,
  uploadBrandingAsset,
} from "@/services/brandingApi";
import {
  BRANDING_HERO_MAX_BYTES,
  BRANDING_LOGO_MAX_BYTES,
} from "@/types/branding";
import type { BrandingDraft, BrandingSlot } from "@/types/branding";

const SLOT_DEFINITIONS: Array<{
  key: keyof BrandingDraft;
  slot: BrandingSlot;
  titleKey: TranslationKey;
  fallbackLabelKey: TranslationKey;
  shape: "wide" | "square" | "panel";
  maxBytes: number;
}> = [
  {
    key: "sidebarLogoExpandedPath",
    slot: "sidebarLogoExpanded",
    titleKey: "operator.settings.branding.expandedTitle",
    fallbackLabelKey: "operator.settings.branding.useDefault",
    shape: "wide",
    maxBytes: BRANDING_LOGO_MAX_BYTES,
  },
  {
    key: "sidebarLogoCollapsedPath",
    slot: "sidebarLogoCollapsed",
    titleKey: "operator.settings.branding.collapsedTitle",
    fallbackLabelKey: "operator.settings.branding.useExpanded",
    shape: "square",
    maxBytes: BRANDING_LOGO_MAX_BYTES,
  },
  {
    key: "authLogoPath",
    slot: "authLogo",
    titleKey: "operator.settings.branding.authLogoTitle",
    fallbackLabelKey: "operator.settings.branding.useExpanded",
    shape: "wide",
    maxBytes: BRANDING_LOGO_MAX_BYTES,
  },
  {
    key: "authHeroImagePath",
    slot: "authHeroImage",
    titleKey: "operator.settings.branding.heroTitle",
    fallbackLabelKey: "operator.settings.branding.useDefault",
    shape: "panel",
    maxBytes: BRANDING_HERO_MAX_BYTES,
  },
];

const SHAPE_RATIO_LABEL: Record<"wide" | "square" | "panel", TranslationKey> =
  {
    wide: "operator.settings.branding.ratioWide",
    square: "operator.settings.branding.ratioSquare",
    panel: "operator.settings.branding.ratioLandscape",
  };

const IMAGE_INPUT_CLASS: Record<"wide" | "square" | "panel", string> = {
  wide: "[&_img]:object-contain",
  square: "[&_img]:object-contain",
  panel: "[&_img]:object-cover",
};

const IMAGE_PREVIEW_STYLE: Record<
  "wide" | "square" | "panel",
  CSSProperties
> = {
  wide: { width: 126, height: 42 },
  square: { width: 80, height: 80 },
  panel: { width: 96, height: 112 },
};

export function BrandAssetsPanel({
  onStateChange,
}: Readonly<{
  onStateChange?: (state: {
    dirty: boolean;
    saving: boolean;
    uploading: number;
  }) => void;
}>) {
  const { t } = useKafilLanguage();
  const {
    isAdmin,
    config,
    resolved,
    draft,
    isDirty,
    beginDraft,
    setSlot,
    clearSlot,
    revertSlot,
    revertAll,
  } = useKafilBranding();
  const [uploading, setUploading] = useState<Record<BrandingSlot, boolean>>({
    sidebarLogoExpanded: false,
    sidebarLogoCollapsed: false,
    authLogo: false,
    authHeroImage: false,
  });
  useEffect(() => {
    if (isAdmin && !draft) beginDraft();
  }, [isAdmin, beginDraft, draft]);

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      dirty: isDirty,
      saving: false,
      uploading: Object.values(uploading).filter(Boolean).length,
    });
  }, [isDirty, onStateChange, uploading]);

  if (!isAdmin) return null;

  const valueFor = (key: keyof BrandingDraft): string => {
    if (draft) {
      const draftValue = draft[key];
      if (draftValue !== undefined && draftValue !== null) {
        if (draftValue === config[key] && resolved[key] !== draftValue) {
          return resolved[key];
        }
        return draftValue;
      }
    }
    return resolved[key];
  };

  const customPathFor = (key: keyof BrandingDraft): string | null => {
    if (draft && draft[key] !== undefined) {
      return draft[key];
    }
    return config[key];
  };

  const handleFile = async (
    definition: (typeof SLOT_DEFINITIONS)[number],
    file: File,
  ) => {
    if (!brandingExtensionForFile(file) || brandingExtensionForFile(file) === "img") {
      toast.error(t("operator.settings.branding.uploadError"));
      return;
    }
    setUploading((current) => ({ ...current, [definition.slot]: true }));
    try {
      const uploaded = await uploadBrandingAsset({
        slot: definition.slot,
        file,
      });
      setSlot(definition.key, uploaded.path);
      toast.success(t("operator.settings.branding.uploadSuccess"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("operator.settings.branding.uploadError"),
      );
    } finally {
      setUploading((current) => ({ ...current, [definition.slot]: false }));
    }
  };

  return (
    <NCard
      title={t("operator.settings.branding.cardTitle")}
      description={t("operator.settings.branding.formatsSummary", {
        formats: "PNG, JPEG, WebP, AVIF",
        logoSize: BRANDING_LOGO_MAX_BYTES / 1_000_000,
        heroSize: BRANDING_HERO_MAX_BYTES / 1_000_000,
      })}
    >
      <ul className="flex flex-col divide-y divide-border">
        {SLOT_DEFINITIONS.map((definition) => {
          const slotValue = valueFor(definition.key);
          const customPath = customPathFor(definition.key);
          const isUploading = uploading[definition.slot];
          const draftChanged = customPath !== config[definition.key];
          const customAssetUnavailable = Boolean(
            customPath &&
              customPath === config[definition.key] &&
              resolved[definition.key] !== customPath,
          );
          return (
            <li
              key={definition.key}
              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className={IMAGE_INPUT_CLASS[definition.shape]}>
                <ImageInput
                  value={slotValue}
                  onChange={(file) => {
                    if (file) void handleFile(definition, file);
                  }}
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  imageSize="sm"
                  previewStyle={IMAGE_PREVIEW_STYLE[definition.shape]}
                  allowClear={false}
                  disabled={isUploading}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {t(definition.titleKey)}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {t(SHAPE_RATIO_LABEL[definition.shape])}
                </p>
                {customAssetUnavailable ? (
                  <p
                    className="mt-1 text-xs text-warning"
                    data-branding-unavailable={definition.slot}
                    role="status"
                  >
                    {t("operator.settings.branding.missingAsset")}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {draftChanged ? (
                  <NButton
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("operator.settings.branding.revertSlot")}
                    title={t("operator.settings.branding.revertSlot")}
                    disabled={isUploading}
                    onClick={() => revertSlot(definition.key)}
                  >
                    <Undo2 />
                  </NButton>
                ) : null}
                <NButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isUploading || customPath === null}
                  onClick={() => clearSlot(definition.key)}
                >
                  {t(
                    customAssetUnavailable
                      ? "operator.settings.branding.recoverFallback"
                      : definition.fallbackLabelKey,
                  )}
                </NButton>
              </div>
            </li>
          );
        })}
      </ul>
      {isDirty ? (
        <div className="flex justify-end pt-3">
          <NButton
            type="button"
            variant="ghost"
            size="sm"
            disabled={!isDirty}
            onClick={revertAll}
          >
            <RotateCcw />
            {t("operator.settings.branding.revertAll")}
          </NButton>
        </div>
      ) : null}
    </NCard>
  );
}
