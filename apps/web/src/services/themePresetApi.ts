import type { PublicAppearance } from "@/types/appearance";
import type {
  ApplyThemePresetInput,
  CreateThemePresetInput,
  ThemePreset,
} from "@/types/themePreset";
import { api } from "@/services/http";

export function listThemePresets() {
  return api.get<ThemePreset[]>("/theme-presets");
}

export function createThemePreset(input: CreateThemePresetInput) {
  return api.post<ThemePreset>("/theme-presets", input);
}

export function applyThemePreset({ id, ...body }: ApplyThemePresetInput) {
  return api.post<PublicAppearance>(`/theme-presets/${id}/apply`, body);
}

export function deleteThemePreset(id: string) {
  return api.delete<ThemePreset>(`/theme-presets/${id}`);
}
