import type {
  FundingSetting,
  UpdateFundingSettingInput,
} from "@/features/Settings/types";
import { api } from "@/services/http";

export function getFundingSetting() {
  return api.get<FundingSetting>("/settings/funding");
}

export function updateFundingSetting(input: UpdateFundingSettingInput) {
  return api.put<FundingSetting>("/settings/funding", input);
}
