import { entityKeys } from "najm-kit/query/keys";

export const sponsorProfileKeys = {
  all: entityKeys.all("sponsor-profile"),
  profile: entityKeys.detail("sponsor-profile", "me"),
};
