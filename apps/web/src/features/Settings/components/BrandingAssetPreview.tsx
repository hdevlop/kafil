"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

const FALLBACK_BY_ASPECT: Record<string, { width: number; height: number }> = {
  "3:1": { width: 240, height: 80 },
  "1:1": { width: 96, height: 96 },
  Free: { width: 320, height: 180 },
};

export function BrandingAssetPreview({
  src,
  alt,
  aspect,
}: Readonly<{
  src: string;
  alt: string;
  aspect: string;
}>) {
  const [hasError, setHasError] = useState(false);
  const size = FALLBACK_BY_ASPECT[aspect] ?? FALLBACK_BY_ASPECT.Free;
  const showFallback = !src || hasError;

  if (showFallback) {
    return (
      <div
        className="flex w-full items-center justify-center rounded-md border border-dashed border-border bg-background text-xs text-muted-foreground"
        style={{ aspectRatio: aspect === "Free" ? "16 / 9" : aspect.replace(":", " / ") }}
        data-testid="branding-preview-fallback"
        role="img"
        aria-label={alt}
      >
        {alt}
      </div>
    );
  }

  const props: ImageProps = {
    alt,
    src,
    width: size.width,
    height: size.height,
    className: "max-h-32 w-auto rounded-md object-contain",
    onError: () => setHasError(true),
    unoptimized: src.startsWith("/api/branding/assets/serve/"),
  };

  return <Image {...props} alt={alt} />;
}
