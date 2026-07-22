import { entityKeys } from "@/hooks/queryKeys";

export const sponsorProfileKeys = {
  all: entityKeys.all("sponsor-profile"),
  profile: entityKeys.detail("sponsor-profile", "me"),
};
