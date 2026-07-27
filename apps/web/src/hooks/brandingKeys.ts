import { entityKeys } from "@/hooks/queryKeys";

export const brandingKeys = {
  all: entityKeys.all("branding"),
  current: entityKeys.detail("branding", "current"),
};
