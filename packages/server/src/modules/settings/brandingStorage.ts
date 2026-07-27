import { extname } from "node:path";

import { HttpError } from "najm-core";

import { BRANDING_HERO_MAX_BYTES, BRANDING_LOGO_MAX_BYTES } from "./brandingConstants";
import type { BrandingSlot } from "./brandingTypes";

const SLOT_MAX_BYTES: Record<BrandingSlot, number> = {
  sidebarLogoExpanded: BRANDING_LOGO_MAX_BYTES,
  sidebarLogoCollapsed: BRANDING_LOGO_MAX_BYTES,
  authLogo: BRANDING_LOGO_MAX_BYTES,
  authHeroImage: BRANDING_HERO_MAX_BYTES,
};

const EXTENSION_TO_MIME: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const MAGIC_TO_MIME: Array<{
  mime: string;
  test: (bytes: Uint8Array) => boolean;
}> = [
  {
    mime: "image/png",
    test: (b) => bytesEqual(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  {
    mime: "image/jpeg",
    test: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  { mime: "image/gif", test: (b) => bytesEqual(b, [0x47, 0x49, 0x46, 0x38]) },
  {
    mime: "image/webp",
    test: (b) =>
      b.length >= 12 &&
      bytesEqual(b.subarray(0, 4), [0x52, 0x49, 0x46, 0x46]) &&
      bytesEqual(b.subarray(8, 12), [0x57, 0x45, 0x42, 0x50]),
  },
  {
    mime: "image/avif",
    test: (b) =>
      b.length >= 16 &&
      containsAscii(b.subarray(4, 8), "ftyp") &&
      (containsAscii(b.subarray(8, 12), "avif") ||
        containsAscii(b.subarray(8, 12), "avis")),
  },
];

function bytesEqual(a: Uint8Array, b: readonly number[]): boolean {
  if (a.length < b.length) return false;
  for (let i = 0; i < b.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function containsAscii(bytes: Uint8Array, needle: string): boolean {
  for (let i = 0; i + needle.length <= bytes.length; i += 1) {
    let match = true;
    for (let j = 0; j < needle.length; j += 1) {
      if (bytes[i + j] !== needle.charCodeAt(j)) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  return false;
}

export function detectBrandingAssetMime(bytes: Uint8Array): string | undefined {
  for (const candidate of MAGIC_TO_MIME) {
    if (candidate.test(bytes)) return candidate.mime;
  }
  return undefined;
}

export function assertBrandingAssetMatchesMime(
  detected: string | undefined,
  declared: string,
) {
  if (!detected) {
    HttpError.create(
      415,
      "Branding asset content does not match a supported image format",
    );
  }
  if (detected !== declared) {
    HttpError.create(
      415,
      "Branding asset content does not match its declared content type",
    );
  }
}

export function assertBrandingBytesWithinSlotLimit(
  slot: BrandingSlot,
  bytes: number,
) {
  if (bytes <= 0) HttpError.create(413, "Branding asset must not be empty");
  if (bytes > SLOT_MAX_BYTES[slot]) {
    HttpError.create(
      413,
      `Branding asset exceeds the ${formatBytes(SLOT_MAX_BYTES[slot])} limit for ${slot}`,
    );
  }
}

function formatBytes(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)} MB`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)} KB`;
  return `${value} B`;
}

export function assertBrandingExtensionMatchesMime(
  fileName: string,
  declaredMime: string,
) {
  const ext = extname(fileName).toLowerCase();
  const expected = EXTENSION_TO_MIME[ext];
  if (!expected) HttpError.create(400, "Invalid branding asset file name");
  if (expected.toLowerCase() !== declaredMime.toLowerCase()) {
    HttpError.create(
      415,
      "Branding asset content type does not match its file extension",
    );
  }
}
