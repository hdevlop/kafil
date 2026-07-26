import { entityKeys } from "@/hooks/queryKeys";

export const appearanceKeys = {
  all: entityKeys.all("appearance"),
  current: entityKeys.detail("appearance", "current"),
};
