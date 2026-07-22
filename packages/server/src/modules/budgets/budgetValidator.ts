import { HttpError, Service } from "najm-core";

import { FamilyValidator } from "../families/familyValidator";
import { BudgetAccountRepository } from "./budgetRepository";

@Service()
export class BudgetValidator {
  constructor(
    private readonly accounts: BudgetAccountRepository,
    private readonly families: FamilyValidator,
  ) {}

  ensureFamilyExists(familyProfileId: string) {
    return this.families.ensureExists(familyProfileId);
  }

  async ensureAccountForFamily(familyProfileId: string) {
    const account = await this.accounts.findByFamilyId(familyProfileId);
    if (!account) {
      HttpError.notFound("Family budget account not found");
    }
    return account;
  }

  ensureSameAccount(expectedAccountId: string, actualAccountId: string) {
    if (expectedAccountId !== actualAccountId) {
      HttpError.conflict("Idempotency key belongs to another budget account");
    }
  }
}
