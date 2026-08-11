export { FundingService } from "./fundingService";
export type { FamilyFundingProgress } from "./fundingService";
export { FundingRepository } from "./fundingRepository";
export {
  calculateCapacity,
  pickEarlierExpiry,
  type CapacityBreakdown,
  type FundingCapacityStatus,
} from "./fundingCapacity";
export { SettingController } from "./settingController";
export * from "./settingDto";
export * from "./settingGuards";
export { SettingRepository } from "./settingRepository";
export type { PlatformSettingsPatch } from "./settingRepository";
export * from "./settingSchema";
export { SettingService } from "./settingService";
export {
  BrandingAssetCompatController,
  ThemePresetCompatController,
} from "./themeCompatController";
// The table only. Appearance, branding, and presets are owned by `najm-theme`;
// `theme_presets` survives here as un-read legacy data for the rollback window.
export * from "./themePresetSchema";
