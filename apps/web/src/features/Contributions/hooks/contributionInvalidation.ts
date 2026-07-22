import { budgetKeys } from "@/features/Budgets/hooks/budgetKeys";
import { familyKeys } from "@/features/Families/hooks/familyKeys";

import { contributionKeys } from "./contributionKeys";

export const contributionInvalidation = {
  contribution: [contributionKeys.all],
  financial: [contributionKeys.all, budgetKeys.all, familyKeys.all],
} as const;
