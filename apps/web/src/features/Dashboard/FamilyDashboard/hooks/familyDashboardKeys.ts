import { entityKeys } from "@/hooks/queryKeys";

export const familyDashboardKeys = {
  all: entityKeys.all("family-dashboard"),
  profile: entityKeys.detail("family-dashboard", "profile"),
  children: entityKeys.list("family-dashboard", { resource: "children" }),
};
