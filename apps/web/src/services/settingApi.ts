import type {
  FormFillSetting,
  FundingSetting,
  UpdateFormFillSettingInput,
  UpdateFundingSettingInput,
} from "@/features/Settings/types";
import { api } from "@/services/http";

export function getFundingSetting() {
  return api.get<FundingSetting>("/settings/funding");
}

export function updateFundingSetting(input: UpdateFundingSettingInput) {
  return api.put<FundingSetting>("/settings/funding", input);
}

export function getFormFillSetting() {
  return api.get<FormFillSetting>("/settings/form-fill");
}

export function updateFormFillSetting(input: UpdateFormFillSettingInput) {
  return api.put<FormFillSetting>("/settings/form-fill", input);
}
