"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

const PROTECTED_IMAGE_PREFIXES = [
  "/api/family-images/files/serve/",
  "/api/sponsor-images/files/serve/",
  "/api/operator-images/files/serve/",
  "/api/child-images/files/serve/",
  "/api/category-images/files/serve/",
  "/api/product-images/files/serve/",
  "/api/staff-images/files/serve/",
] as const;

export function isProtectedImageSource(src: string) {
  return PROTECTED_IMAGE_PREFIXES.some((prefix) => src.startsWith(prefix));
}

type ProtectedImageProps = Omit<
  ImageProps,
  "onError" | "src" | "unoptimized"
> & {
  fallbackSrc?: string;
  onError?: ImageProps["onError"];
  src: string;
};

export function ProtectedImage({
  alt,
  fallbackSrc,
  loading = "lazy",
  onError,
  src,
  ...props
}: ProtectedImageProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);

  const resolved = failedSource === src && fallbackSrc ? fallbackSrc : src;

  return (
    <Image
      {...props}
      alt={alt}
      loading={loading}
      onError={(event) => {
        setFailedSource(src);
        onError?.(event);
      }}
      src={resolved}
      unoptimized={isProtectedImageSource(resolved)}
    />
  );
}
