"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

const FACTORY_FALLBACKS: Record<string, string> = {
  sidebarLogoExpanded: "/logoExpanded.webp",
  sidebarLogoCollapsed: "/logoExpanded.webp",
  authLogo: "/logoExpanded.webp",
  authHeroImage: "/HeroA.webp",
};

export type BrandingImageSlot = keyof typeof FACTORY_FALLBACKS;

type BrandingImageBaseProps = {
  slot: BrandingImageSlot;
  src: string;
  alt: string;
  className?: string;
  preload?: boolean;
};

type BrandingImageFixedProps = BrandingImageBaseProps & {
  fill?: false;
  width: number;
  height: number;
  sizes?: string;
  "aria-hidden"?: boolean | "true" | "false";
};

type BrandingImageFillProps = BrandingImageBaseProps & {
  fill: true;
  width?: number;
  height?: number;
  sizes?: string;
  "aria-hidden"?: boolean | "true" | "false";
};

type BrandingImageProps = BrandingImageFixedProps | BrandingImageFillProps;

export function BrandingImage(props: BrandingImageProps) {
  const { slot, src, alt, className, preload } = props;
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const fallback = FACTORY_FALLBACKS[slot] ?? src;
  const candidate = !src ? fallback : src;
  const isErrorForCurrent = errorKey === candidate;
  const resolved = isErrorForCurrent ? fallback : candidate;
  if (props.fill) {
    const imageProps: ImageProps = {
      alt,
      src: resolved,
      fill: true,
      sizes: props.sizes ?? "(min-width: 1024px) 50vw, 100vw",
      className,
      onError: () => setErrorKey(candidate),
      preload,
      "aria-hidden": props["aria-hidden"],
    };
    return <Image {...imageProps} alt={alt} />;
  }

  const imageProps: ImageProps = {
    alt,
    src: resolved,
    width: props.width,
    height: props.height,
    className,
    onError: () => setErrorKey(candidate),
    preload,
    "aria-hidden": props["aria-hidden"],
  };
  return <Image {...imageProps} alt={alt} />;
}
