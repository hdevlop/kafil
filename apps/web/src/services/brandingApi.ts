import { api } from "@/services/http";
import type {
  AdminBrandingConfig,
  PublicBranding,
  ResetBrandingInput,
  UpdateBrandingInput,
  UploadBrandingAssetResult,
} from "@/types/branding";

export function getBranding() {
  return api.get<PublicBranding>("/branding");
}

export function getBrandingConfig() {
  return api.get<AdminBrandingConfig>("/branding/config");
}

export function updateBranding(input: UpdateBrandingInput) {
  return api.put<PublicBranding>("/branding", input);
}

export function resetBranding(input: ResetBrandingInput) {
  return api.post<PublicBranding>("/branding/reset", input);
}

const BRANDING_ASSET_ROUTE = "/branding/assets/";
const BRANDING_ASSET_SERVE_PREFIX = "/api/branding/assets/serve/";

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/avif": "avif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function brandingExtensionForFile(file: File) {
  return EXTENSION_BY_MIME[file.type] ?? "img";
}

export async function uploadBrandingAsset(input: {
  slot: string;
  file: File;
}): Promise<UploadBrandingAssetResult> {
  const extension = brandingExtensionForFile(input.file);
  const fileName = `${crypto.randomUUID()}.${extension}`;
  return api.upload<UploadBrandingAssetResult>(
    `${BRANDING_ASSET_ROUTE}${encodeURIComponent(input.slot)}/${encodeURIComponent(fileName)}`,
    input.file,
  );
}

export function deleteBrandingAsset(path: string) {
  const fileName = decodeURIComponent(path.slice(BRANDING_ASSET_SERVE_PREFIX.length));
  return api.delete<{ deleted: boolean; referenced: boolean }>(
    `${BRANDING_ASSET_ROUTE}${encodeURIComponent(fileName)}`,
  );
}

export function deleteBrandingCandidates(paths: string[]) {
  return api.delete<{ deleted: number; skipped: number }>(
    BRANDING_ASSET_ROUTE,
    { paths },
  );
}
