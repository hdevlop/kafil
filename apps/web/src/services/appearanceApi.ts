import type {
  PublicAppearance,
  ResetAppearanceInput,
  UpdateAppearanceInput,
} from "@/types/appearance";
import { api } from "@/services/http";

export function getAppearance() {
  return api.get<PublicAppearance>("/appearance");
}

export function updateAppearance(input: UpdateAppearanceInput) {
  return api.put<PublicAppearance>("/appearance", input);
}

export function resetAppearance(input: ResetAppearanceInput) {
  return api.post<PublicAppearance>("/appearance/reset", input);
}
