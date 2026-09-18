import { entityKeys } from "najm-kit/query/keys";

export const familyBudgetKeys = {
  all: entityKeys.all("family-budget"),
  summary: entityKeys.detail("family-budget", "summary"),
};
