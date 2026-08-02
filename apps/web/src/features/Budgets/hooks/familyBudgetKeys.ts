import { entityKeys } from "@/hooks/queryKeys";

export const familyBudgetKeys = {
  all: entityKeys.all("family-budget"),
  summary: entityKeys.detail("family-budget", "summary"),
};
