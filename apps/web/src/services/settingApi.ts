import type { PlatformSettings, UpdateSettingsInput } from "@/features/Settings/types";
import { api } from "@/services/http";

export function getSettings() {
  return api.get<PlatformSettings>("/settings");
}

export function updateSettings(input: UpdateSettingsInput) {
  return api.put<PlatformSettings>("/settings", input);
}
