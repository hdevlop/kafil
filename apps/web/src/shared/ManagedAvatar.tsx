"use client";

import { useState, type ReactNode } from "react";
import {
  Avatar,
  cn,
  type NAvatarClassNames,
  type NAvatarShape,
} from "najm-kit";

import { ProtectedImage } from "@/shared/ProtectedImage";

type ManagedAvatarSize = "sm" | "md" | "lg" | "xl";

const SIZE_CLASSES: Record<ManagedAvatarSize, string> = {
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
  xl: "size-16",
};

const TEXT_SIZE_CLASSES: Record<ManagedAvatarSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg",
};

const IMAGE_SIZES: Record<ManagedAvatarSize, string> = {
  sm: "32px",
  md: "40px",
  lg: "48px",
  xl: "64px",
};

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function withVersion(src: string, version: string | number | null | undefined) {
  if (!version || src.startsWith("data:") || src.startsWith("blob:")) return src;
  return `${src}${src.includes("?") ? "&" : "?"}v=${encodeURIComponent(String(version))}`;
}

export function ManagedAvatar({
  alt,
  className,
  classNames,
  fallback,
  fallbackSrc,
  meta,
  shape = "circle",
  size = "md",
  src,
  srcVersion,
  subtitle,
  title,
  version,
}: Readonly<{
  alt?: string;
  className?: string;
  classNames?: NAvatarClassNames;
  fallback?: string;
  fallbackSrc?: string;
  meta?: ReactNode;
  shape?: NAvatarShape;
  size?: ManagedAvatarSize;
  src?: string | null;
  srcVersion?: string | number | null;
  subtitle?: string;
  title?: string;
  version?: string | number | null;
}>) {
  const candidate = src && src !== "noavatar.png" ? src : fallbackSrc;
  const resolved = candidate
    ? withVersion(candidate, srcVersion ?? version)
    : undefined;
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const label = title || fallback || alt || "";
  const fallbackText = fallback && !title ? fallback : initials(label) || "?";
  const hasText = Boolean(title || subtitle || meta);

  return (
    <div className={cn("flex items-center gap-3", classNames?.root, className)}>
      <Avatar
        className={cn(SIZE_CLASSES[size], "bg-muted", classNames?.avatar)}
        shape={shape}
        size={size}
      >
        <span
          aria-hidden
          className={cn(
            "flex size-full items-center justify-center bg-muted font-semibold text-foreground",
            TEXT_SIZE_CLASSES[size],
            classNames?.fallback,
          )}
        >
          {fallbackText}
        </span>
        {resolved && failedSource !== resolved ? (
          <ProtectedImage
            alt={alt || label}
            className={cn("object-cover", classNames?.image)}
            fill
            loading="lazy"
            onError={() => setFailedSource(resolved)}
            sizes={IMAGE_SIZES[size]}
            src={resolved}
          />
        ) : null}
      </Avatar>
      {hasText ? (
        <div className="flex min-w-0 flex-col">
          {title ? (
            <span
              className={cn(
                "truncate font-medium text-foreground",
                TEXT_SIZE_CLASSES[size],
                classNames?.title,
              )}
            >
              {title}
            </span>
          ) : null}
          {subtitle ? (
            <span className={cn("truncate text-xs text-muted-foreground", classNames?.subtitle)}>
              {subtitle}
            </span>
          ) : null}
          {meta ? (
            <span className={cn("text-xs text-muted-foreground", classNames?.meta)}>
              {meta}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
