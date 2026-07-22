import { HttpError, Service } from "najm-core";
import { Transaction } from "najm-database";

import { AuditService } from "../audit/auditService";
import { FamilyRepository } from "../families/familyRepository";
import { FundingService } from "../settings/fundingService";
import {
  type BudgetLedgerListQuery,
  budgetLedgerListQuery,
  type ManualBudgetAdjustmentDto,
  manualBudgetAdjustmentDto,
  type SetMonthlyBudgetLimitDto,
  setMonthlyBudgetLimitDto,
} from "./budgetDto";
import {
  BudgetAccountRepository,
  BudgetLedgerRepository,
  MonthlyBudgetLimitRepository,
} from "./budgetRepository";
import type { BudgetLedgerEntry } from "./budgetSchema";
import { applyBudgetBalanceDelta } from "./money";
import { BudgetValidator } from "./budgetValidator";

@Service()
export class BudgetService {
  constructor(
    private readonly accounts: BudgetAccountRepository,
    private readonly ledger: BudgetLedgerRepository,
    private readonly limits: MonthlyBudgetLimitRepository,
    private readonly families: FamilyRepository,
    private readonly audits: AuditService,
    private readonly validator: BudgetValidator,
    private readonly funding: FundingService,
  ) {}

  async getSummary(familyProfileId: string) {
    const account = await this.validator.ensureAccountForFamily(
      familyProfileId,
    );
    const monthlyLimit = await this.limits.findByAccountAndMonth(
      account.id,
      currentMonth(),
    );
    const funding = await this.funding.getProgress(familyProfileId);
    return {
      currency: account.currency,
      availableMinor: account.availableMinor,
      reservedMinor: account.reservedMinor,
      spentMinor: account.spentMinor,
      version: account.version,
      monthlyLimit: monthlyLimit
        ? { month: monthlyLimit.month, limitMinor: monthlyLimit.limitMinor }
        : null,
      funding,
    };
  }

  async getOwnSummary(userId: string) {
    const family = await this.families.findByUserId(userId);
    if (!family || family.role !== "family") {
      HttpError.notFound("Family budget not found");
    }
    return this.getSummary(family.id);
  }

  async listLedger(familyProfileId: string, query: BudgetLedgerListQuery) {
    const { limit, offset } = budgetLedgerListQuery.parse(query ?? {});
    const account = await this.validator.ensureAccountForFamily(
      familyProfileId,
    );
    return this.ledger.listByAccountId(account.id, limit, offset);
  }

  async listOwnLedger(userId: string, query: BudgetLedgerListQuery) {
    const family = await this.families.findByUserId(userId);
    if (!family || family.role !== "family") {
      HttpError.notFound("Family budget not found");
    }
    const entries = await this.listLedger(family.id, query);
    return entries.map(toFamilyBudgetLedgerProjection);
  }

  async reconcile(familyProfileId: string) {
    const account = await this.validator.ensureAccountForFamily(
      familyProfileId,
    );
    const latest = await this.ledger.findLatestByAccountId(account.id);
    const ledgerBalance = latest
      ? {
          availableMinor: latest.availableAfterMinor,
          reservedMinor: latest.reservedAfterMinor,
          spentMinor: latest.spentAfterMinor,
        }
      : { availableMinor: 0, reservedMinor: 0, spentMinor: 0 };
    return {
      accountId: account.id,
      reconciled:
        account.availableMinor === ledgerBalance.availableMinor &&
        account.reservedMinor === ledgerBalance.reservedMinor &&
        account.spentMinor === ledgerBalance.spentMinor,
      account: {
        availableMinor: account.availableMinor,
        reservedMinor: account.reservedMinor,
        spentMinor: account.spentMinor,
      },
      ledgerBalance,
    };
  }

  async ensureForFamily(familyProfileId: string) {
    await this.validator.ensureFamilyExists(familyProfileId);
    const account = await this.accounts.createForFamily(familyProfileId);
    if (!account) {
      HttpError.notFound("Budget account could not be created");
    }
    return account;
  }

  @Transaction({ retries: 2 })
  async setMonthlyLimit(
    familyProfileId: string,
    data: SetMonthlyBudgetLimitDto,
    actorUserId: string,
  ) {
    const input = setMonthlyBudgetLimitDto.parse(data);
    const account = await this.validator.ensureAccountForFamily(
      familyProfileId,
    );
    const limit = await this.limits.set({
      budgetAccountId: account.id,
      limitMinor: input.limitMinor,
      month: input.month,
      reason: input.reason,
      setByUserId: actorUserId,
    });
    await this.audits.record({
      action: "budget.monthlyLimitSet",
      actorUserId,
      metadata: { limitMinor: input.limitMinor, month: input.month },
      resource: "monthlyBudgetLimits",
      resourceId: limit.id,
    });
    return limit;
  }

  @Transaction({ retries: 2 })
  async adjust(
    familyProfileId: string,
    data: ManualBudgetAdjustmentDto,
    actorUserId: string,
  ) {
    const input = manualBudgetAdjustmentDto.parse(data);
    const existing = await this.ledger.findByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      const account = await this.validator.ensureAccountForFamily(
        familyProfileId,
      );
      this.validator.ensureSameAccount(account.id, existing.budgetAccountId);
      return existing;
    }

    const account = await this.accounts.lockByFamilyId(familyProfileId);
    if (!account) {
      HttpError.notFound("Budget account not found");
    }

    const repeated = await this.ledger.findByIdempotencyKey(input.idempotencyKey);
    if (repeated) {
      this.validator.ensureSameAccount(account.id, repeated.budgetAccountId);
      return repeated;
    }

    let nextBalance;
    try {
      nextBalance = applyBudgetBalanceDelta(account, {
        availableMinor: input.amountMinor,
      });
    } catch {
      HttpError.conflict("Budget adjustment would make the balance invalid");
    }

    const updated = await this.accounts.updateBalances(account.id, nextBalance);
    if (!updated) {
      HttpError.notFound("Budget account not found");
    }
    const entry = await this.ledger.append({
      budgetAccountId: account.id,
      entryType:
        input.amountMinor > 0 ? "manual_credit" : "manual_debit",
      amountMinor: input.amountMinor,
      availableAfterMinor: updated.availableMinor,
      reservedAfterMinor: updated.reservedMinor,
      spentAfterMinor: updated.spentMinor,
      sourceType: "manual_adjustment",
      sourceId: account.id,
      idempotencyKey: input.idempotencyKey,
      actorUserId,
      reason: input.reason,
    });
    await this.audits.record({
      action: "budget.manuallyAdjusted",
      actorUserId,
      metadata: { amountMinor: input.amountMinor },
      resource: "budgetLedgerEntries",
      resourceId: entry.id,
    });
    return entry;
  }
}

function toFamilyBudgetLedgerProjection(entry: BudgetLedgerEntry) {
  return {
    id: entry.id,
    entryType: entry.entryType,
    amountMinor: entry.amountMinor,
    availableAfterMinor: entry.availableAfterMinor,
    reservedAfterMinor: entry.reservedAfterMinor,
    spentAfterMinor: entry.spentAfterMinor,
    sourceType: entry.sourceType,
    createdAt: entry.createdAt,
  };
}

function currentMonth() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}
