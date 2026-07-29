import { randomUUID } from "node:crypto";
import { link, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

import { HttpError } from "najm-core";
import sharp, { type Metadata } from "sharp";

export const MANAGED_IMAGE_MAX_INPUT_BYTES = 5_000_000;
export const MANAGED_IMAGE_MAX_AXIS = 8_192;
export const MANAGED_IMAGE_MAX_PIXELS = 24_000_000;
export const MANAGED_IMAGE_OUTPUT_MIME = "image/webp";

export type ManagedImageProfileName =
  | "person"
  | "catalog"
  | "brandingLogo"
  | "brandingHero";

export interface ManagedImageProfile {
  maxBytes: number;
  maxHeight: number;
  maxWidth: number;
  minQuality: number;
  quality: number;
}

export const MANAGED_IMAGE_PROFILES: Record<
  ManagedImageProfileName,
  ManagedImageProfile
> = {
  person: {
    maxBytes: 150_000,
    maxHeight: 640,
    maxWidth: 640,
    minQuality: 60,
    quality: 80,
  },
  catalog: {
    maxBytes: 200_000,
    maxHeight: 1_280,
    maxWidth: 1_280,
    minQuality: 62,
    quality: 82,
  },
  brandingLogo: {
    maxBytes: 150_000,
    maxHeight: 512,
    maxWidth: 1_024,
    minQuality: 65,
    quality: 85,
  },
  brandingHero: {
    maxBytes: 350_000,
    maxHeight: 1_280,
    maxWidth: 1_920,
    minQuality: 62,
    quality: 82,
  },
};

export const MANAGED_IMAGE_LEGACY_MIME_BY_EXTENSION: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const MANAGED_FILE_NAME =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:avif|gif|jpe?g|png|webp)$/i;
const UPLOAD_FILE_NAME =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(?:avif|jpe?g|png|webp)$/i;

export interface NormalizedManagedImage {
  bytes: Uint8Array;
  height: number;
  mime: typeof MANAGED_IMAGE_OUTPUT_MIME;
  width: number;
}

export interface WrittenManagedImage extends Omit<NormalizedManagedImage, "bytes"> {
  absolutePath: string;
  fileName: string;
  path: string;
}

export async function assertManagedImageCompliant(
  bytes: Uint8Array,
  profileName: ManagedImageProfileName,
) {
  const profile = MANAGED_IMAGE_PROFILES[profileName];
  if (bytes.byteLength === 0 || bytes.byteLength > profile.maxBytes) {
    throw new Error(
      `Managed ${profileName} image exceeds its ${profile.maxBytes} byte budget`,
    );
  }
  const metadata = await sharp(bytes, {
    failOn: "warning",
    limitInputPixels: MANAGED_IMAGE_MAX_PIXELS,
  }).metadata();
  if (
    metadata.format !== "webp" ||
    !metadata.width ||
    !metadata.height ||
    metadata.width > profile.maxWidth ||
    metadata.height > profile.maxHeight ||
    (metadata.pages ?? 1) > 1
  ) {
    throw new Error(`Managed ${profileName} image is not a compliant static WebP`);
  }
  return {
    bytes: bytes.byteLength,
    height: metadata.height,
    mime: MANAGED_IMAGE_OUTPUT_MIME,
    width: metadata.width,
  };
}

function reject(status: number, message: string): never {
  HttpError.create(status, message);
  throw new Error(message);
}

function bytesEqual(bytes: Uint8Array, expected: readonly number[], offset = 0) {
  if (bytes.length < offset + expected.length) return false;
  return expected.every((value, index) => bytes[offset + index] === value);
}

export function detectManagedImageMime(bytes: Uint8Array): string | undefined {
  if (bytesEqual(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (bytesEqual(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (
    bytesEqual(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytesEqual(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return "image/webp";
  }
  if (bytesEqual(bytes, [0x47, 0x49, 0x46, 0x38])) return "image/gif";
  if (bytes.length >= 16 && bytesEqual(bytes, [0x66, 0x74, 0x79, 0x70], 4)) {
    const brand = String.fromCharCode(...bytes.subarray(8, 12));
    if (brand === "avif" || brand === "avis") return "image/avif";
  }
  return undefined;
}

function assertInput(
  bytes: Uint8Array,
  declaredMime: string | undefined,
): string {
  if (bytes.byteLength === 0 || bytes.byteLength > MANAGED_IMAGE_MAX_INPUT_BYTES) {
    reject(413, "Image must be between 1 byte and 5 MB");
  }
  const detected = detectManagedImageMime(bytes);
  if (!detected) reject(415, "Unsupported or malformed image content");
  if (detected === "image/gif") {
    reject(415, "Animated GIF images are not supported; use PNG, JPEG, WebP, or AVIF");
  }
  const normalizedDeclared = declaredMime?.split(";", 1)[0]?.trim().toLowerCase();
  if (normalizedDeclared && normalizedDeclared !== detected) {
    reject(415, "Image content does not match its declared content type");
  }
  return detected;
}

function assertDecodedDimensions(metadata: Metadata) {
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (width <= 0 || height <= 0) reject(415, "Image dimensions could not be decoded");
  if (
    width > MANAGED_IMAGE_MAX_AXIS ||
    height > MANAGED_IMAGE_MAX_AXIS ||
    width * height > MANAGED_IMAGE_MAX_PIXELS
  ) {
    reject(413, "Decoded image exceeds the 8192 px / 24 megapixel safety limit");
  }
  if ((metadata.pages ?? 1) > 1) reject(415, "Animated images are not supported");
}

async function encodeWebp(
  bytes: Uint8Array,
  width: number,
  height: number,
  quality: number,
) {
  return sharp(bytes, {
    failOn: "warning",
    limitInputPixels: MANAGED_IMAGE_MAX_PIXELS,
  })
    .autoOrient()
    .resize({
      width,
      height,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ alphaQuality: 100, effort: 4, quality })
    .toBuffer();
}

export async function normalizeManagedImage(
  input: Uint8Array,
  profileName: ManagedImageProfileName,
  declaredMime?: string,
): Promise<NormalizedManagedImage> {
  const bytes = new Uint8Array(input);
  assertInput(bytes, declaredMime);
  let metadata: Metadata;
  try {
    metadata = await sharp(bytes, {
      failOn: "warning",
      limitInputPixels: MANAGED_IMAGE_MAX_PIXELS,
    }).metadata();
  } catch {
    reject(415, "Image could not be decoded safely");
  }
  assertDecodedDimensions(metadata!);

  const profile = MANAGED_IMAGE_PROFILES[profileName];
  let maxWidth = profile.maxWidth;
  let maxHeight = profile.maxHeight;
  let encoded: Buffer | undefined;

  const qualities = [
    profile.quality,
    Math.max(profile.minQuality, profile.quality - 10),
    profile.minQuality,
  ].filter((quality, index, values) => values.indexOf(quality) === index);
  for (const quality of qualities) {
    try {
      encoded = await encodeWebp(bytes, maxWidth, maxHeight, quality);
    } catch {
      reject(415, "Image could not be normalized safely");
    }
    if (encoded.byteLength <= profile.maxBytes) break;
  }

  for (
    let dimensionAttempt = 0;
    encoded && encoded.byteLength > profile.maxBytes && dimensionAttempt < 12;
    dimensionAttempt += 1
  ) {
    maxWidth = Math.max(128, Math.floor(maxWidth * 0.85));
    maxHeight = Math.max(128, Math.floor(maxHeight * 0.85));
    try {
      encoded = await encodeWebp(bytes, maxWidth, maxHeight, profile.minQuality);
    } catch {
      reject(415, "Image could not be normalized safely");
    }
  }

  if (!encoded || encoded.byteLength > profile.maxBytes) {
    reject(422, `Image could not be reduced below ${profile.maxBytes} bytes`);
  }

  const outputMetadata = await sharp(encoded).metadata();
  if (
    outputMetadata.format !== "webp" ||
    !outputMetadata.width ||
    !outputMetadata.height ||
    outputMetadata.width > profile.maxWidth ||
    outputMetadata.height > profile.maxHeight
  ) {
    reject(500, "Normalized image failed output verification");
  }

  return {
    bytes: new Uint8Array(encoded),
    height: outputMetadata.height,
    mime: MANAGED_IMAGE_OUTPUT_MIME,
    width: outputMetadata.width,
  };
}

export function decodeManagedImageFileName(rawFileName: string): string {
  const fileName = decodeURIComponent(rawFileName);
  if (!MANAGED_FILE_NAME.test(fileName)) reject(400, "Invalid managed image file name");
  return fileName;
}

export function managedImageMimeForFileName(fileName: string): string {
  const mime = MANAGED_IMAGE_LEGACY_MIME_BY_EXTENSION[extname(fileName).toLowerCase()];
  if (!mime) reject(400, "Invalid managed image file name");
  return mime;
}

export async function writeManagedImage(input: {
  bytes: Uint8Array;
  declaredMime?: string;
  directory: string;
  profile: ManagedImageProfileName;
  requestedFileName: string;
  reuseExisting?: boolean;
  servePrefix: string;
}): Promise<WrittenManagedImage> {
  const requested = decodeURIComponent(input.requestedFileName);
  const match = UPLOAD_FILE_NAME.exec(requested);
  if (!match) reject(400, "Invalid upload image file name");
  const normalized = await normalizeManagedImage(
    input.bytes,
    input.profile,
    input.declaredMime,
  );
  const fileName = `${match[1]}.webp`;
  await mkdir(input.directory, { recursive: true });
  const absolutePath = join(input.directory, fileName);
  const temporaryPath = join(
    input.directory,
    `.${fileName}.${randomUUID()}.tmp`,
  );
  try {
    await writeFile(temporaryPath, normalized.bytes, { flag: "wx" });
    await link(temporaryPath, absolutePath);
  } catch (error) {
    if (
      !input.reuseExisting ||
      (error as NodeJS.ErrnoException).code !== "EEXIST"
    ) {
      throw error;
    }
    const existing = new Uint8Array(await readFile(absolutePath));
    const existingMetadata = await sharp(existing).metadata();
    const profile = MANAGED_IMAGE_PROFILES[input.profile];
    if (
      existing.byteLength > profile.maxBytes ||
      existingMetadata.format !== "webp" ||
      !existingMetadata.width ||
      !existingMetadata.height ||
      existingMetadata.width > profile.maxWidth ||
      existingMetadata.height > profile.maxHeight
    ) {
      reject(409, "Existing managed image does not match the requested profile");
    }
  } finally {
    await unlink(temporaryPath).catch(() => undefined);
  }
  return {
    absolutePath,
    fileName,
    height: normalized.height,
    mime: normalized.mime,
    path: `${input.servePrefix}${encodeURIComponent(fileName)}`,
    width: normalized.width,
  };
}

export async function readManagedImage(directory: string, rawFileName: string) {
  const fileName = decodeManagedImageFileName(rawFileName);
  return {
    bytes: new Uint8Array(await readFile(join(directory, fileName))),
    fileName,
    mime: managedImageMimeForFileName(fileName),
  };
}
