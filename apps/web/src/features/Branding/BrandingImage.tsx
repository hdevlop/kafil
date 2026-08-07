"use client";

import Image from "next/image";
import { NImage } from "najm-kit";
import {
  FACTORY_AUTH_HERO_IMAGE_PATH,
  FACTORY_SIDEBAR_LOGO_COLLAPSED_PATH,
  FACTORY_SIDEBAR_LOGO_EXPANDED_PATH,
} from "@kafil/server/branding-constants";

const FACTORY_FALLBACKS = {
  sidebarLogoExpanded: FACTORY_SIDEBAR_LOGO_EXPANDED_PATH,
  sidebarLogoCollapsed: FACTORY_SIDEBAR_LOGO_COLLAPSED_PATH,
  authLogo: FACTORY_SIDEBAR_LOGO_EXPANDED_PATH,
  authHeroImage: FACTORY_AUTH_HERO_IMAGE_PATH,
} as const;

export type BrandingImageSlot = keyof typeof FACTORY_FALLBACKS;

type BrandingImageBaseProps = {
  slot: BrandingImageSlot;
  src: string;
  alt: string;
  className?: string;
  preload?: boolean;
  "aria-hidden"?: boolean | "true" | "false";
};

type BrandingImageFixedProps = BrandingImageBaseProps & { fill?: false };
type BrandingImageFillProps = BrandingImageBaseProps & { fill: true; sizes?: string };
type BrandingImageProps = BrandingImageFixedProps | BrandingImageFillProps;

/**
 * `fill` covers responsive photography, where next/image earns its optimizer
 * pass. A fixed-box branding mark does not: its CSS box already pins the size,
 * so it renders as a plain image and skips the oversized srcset entirely.
 */
export function BrandingImage(props: BrandingImageProps) {
  const { slot, src, alt, className, preload } = props;
  const fallback = FACTORY_FALLBACKS[slot];

  if (props.fill) {
    return (
      <Image
        alt={alt}
        src={src || fallback}
        fill
        sizes={props.sizes ?? "(min-width: 1024px) 50vw, 100vw"}
        className={className}
        preload={preload}
        aria-hidden={props["aria-hidden"]}
      />
    );
  }

  return (
    <NImage
      alt={alt}
      src={src || fallback}
      fallback={fallback}
      className={className}
      fetchPriority={preload ? "high" : undefined}
      loading={preload ? "eager" : undefined}
      aria-hidden={props["aria-hidden"]}
    />
  );
}
