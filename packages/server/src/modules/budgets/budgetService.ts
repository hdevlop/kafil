import { HttpError, Service } from "najm-core";
import { Transaction } from "najm-database";

import { AuditService } from "../audit/auditService";
import { FamilyRepository } from "../families/familyRepository";
import { FundingService } from "../settings/fundingService";
import { SettingRepository } from "../settings/settingRepository";
import { OrderRepository } from "../orders/orderRepository";
import {
  type BudgetLedgerListQuery,
  budgetLedgerListQuery,
  type ManualBudgetAdjustmentDto,
  manualBudgetAdjustmentDto,
  type ResetMonthlyBudgetLimitDto,
  resetMonthlyBudgetLimitDto,
  type SetFamilyOrderPolicyDto,
  setFamilyOrderPolicyDto,
  type SetMonthlyBudgetLimitDto,
  setMonthlyBudgetLimitDto,
} from "./budgetDto";
import {
  BudgetAccountRepository,
  BudgetLedgerRepository,
  MonthlyBudgetLimitRepository,
} from "./budgetRepository";
import type { BudgetAccount, BudgetLedgerEntry } from "./budgetSchema";
import { applyBudgetBalanceDelta } from "./money";
import { BudgetValidator } from "./budgetValidator";
import {
  currentMonth,
  monthBounds,
  resolveOrderPolicy,
  type ResolvedOrderPolicy,
} from "./orderPolicy";

export type { ResolvedOrderPolicy };

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
    private readonly settings?: SettingRepository,
    private readonly orderRepo?: OrderRepository,
  ) {}

  private requireSettingsRepository() {
    if (!this.settings) {
      throw new Error("SettingRepository is required for order-policy resolution");
    }
    return this.settings;
  }

  private requireOrderRepository() {
    if (!this.orderRepo) {
      throw new Error("OrderRepository is required for order-policy resolution");
    }
    return this.orderRepo;
  }

  async resolvePolicyForLockedAccount(
    lockedAccount: Pick<
      BudgetAccount,
      "id" | "maxOrdersPerMonth" | "maxBudgetPerOrderMinor"
    >,
    month: string,
  ): Promise<ResolvedOrderPolicy> {
    const [monthlyOverride, globalSettings] = await Promise.all([
      this.limits.findByAccountAndMonth(lockedAccount.id, month),
      this.requireSettingsRepository().find(),
    ]);
    return resolveOrderPolicy(
      {
        id: lockedAccount.id,
        maxOrdersPerMonth: lockedAccount.maxOrdersPerMonth ?? null,
        maxBudgetPerOrderMinor: lockedAccount.maxBudgetPerOrderMinor ?? null,
      },
      monthlyOverride ? { limitMinor: monthlyOverride.limitMinor } : null,
      globalSettings
        ? {
            defaultMaxOrdersPerMonth:
              (globalSettings as { defaultMaxOrdersPerMonth?: number | null })
                .defaultMaxOrdersPerMonth ?? null,
            defaultMaxBudgetPerOrderMinor:
              (
                globalSettings as {
                  defaultMaxBudgetPerOrderMinor?: number | null;
                }
              ).defaultMaxBudgetPerOrderMinor ?? null,
            defaultMonthlyBudgetMinor:
              (
                globalSettings as { defaultMonthlyBudgetMinor?: number | null }
              ).defaultMonthlyBudgetMinor ?? null,
          }
        : null,
    );
  }

  private async buildPolicyContext(
    account: Pick<
      BudgetAccount,
      | "id"
      | "currency"
      | "availableMinor"
      | "reservedMinor"
      | "spentMinor"
      | "version"
      | "familyProfileId"
      | "maxOrdersPerMonth"
      | "maxBudgetPerOrderMinor"
    >,
    month: string,
  ) {
    const [monthlyOverride, globalSettings, monthlyUsedMinor] =
      await Promise.all([
        this.limits.findByAccountAndMonth(account.id, month),
        this.requireSettingsRepository().find(),
        this.ledger.monthlyOrderUsage(account.id, month),
      ]);
    const policy = resolveOrderPolicy(
      {
        id: account.id,
        maxOrdersPerMonth: account.maxOrdersPerMonth ?? null,
        maxBudgetPerOrderMinor: account.maxBudgetPerOrderMinor ?? null,
      },
      monthlyOverride ? { limitMinor: monthlyOverride.limitMinor } : null,
      globalSettings
        ? {
            defaultMaxOrdersPerMonth:
              (globalSettings as { defaultMaxOrdersPerMonth?: number | null })
                .defaultMaxOrdersPerMonth ?? null,
            defaultMaxBudgetPerOrderMinor:
              (
                globalSettings as {
                  defaultMaxBudgetPerOrderMinor?: number | null;
                }
              ).defaultMaxBudgetPerOrderMinor ?? null,
            defaultMonthlyBudgetMinor:
              (
                globalSettings as { defaultMonthlyBudgetMinor?: number | null }
              ).defaultMonthlyBudgetMinor ?? null,
          }
        : null,
    );
    const { start, nextStart } = monthBounds(month);
    const ordersUsed = await this.requireOrderRepository().countActiveInRange(
      account.familyProfileId,
      start,
      nextStart,
    );
    const ordersLimit = policy.maxOrders;
    const ordersRemaining =
      ordersLimit === null ? null : Math.max(0, ordersLimit - ordersUsed);
    return {
      monthlyOverride,
      globalSettings,
      monthlyUsedMinor,
      policy,
      ordersUsed,
      ordersLimit,
      ordersRemaining,
    };
  }

  async getSummary(familyProfileId: string) {
    const month = currentMonth();
    const account = await this.validator.ensureAccountForFamily(
      familyProfileId,
    );
    const funding = await this.funding.getProgress(familyProfileId);
    const ctx = await this.buildPolicyContext(account, month);
    const monthlyLimit = ctx.monthlyOverride
      ? { month: ctx.monthlyOverride.month, limitMinor: ctx.monthlyOverride.limitMinor }
      : null;
    return {
      currency: account.currency,
      availableMinor: account.availableMinor,
      reservedMinor: account.reservedMinor,
      spentMinor: account.spentMinor,
      version: account.version,
      monthlyLimit,
      funding,
      month,
      monthlyUsedMinor: ctx.monthlyUsedMinor,
      monthlyLimitMinor: ctx.policy.monthlyLimitMinor,
      ordersUsed: ctx.ordersUsed,
      ordersLimit: ctx.ordersLimit,
      ordersRemaining: ctx.ordersRemaining,
      maxPerOrderMinor: ctx.policy.maxPerOrderMinor,
      monthly: {
        override: ctx.policy.monthlyOverrideMinor,
        default: ctx.policy.monthlyDefaultMinor,
        effective: ctx.policy.monthlyLimitMinor,
        source: ctx.policy.monthlySource,
        usedMinor: ctx.monthlyUsedMinor,
      },
      orders: {
        override: ctx.policy.maxOrdersOverride,
        default: ctx.policy.maxOrdersDefault,
        effective: ctx.policy.maxOrders,
        source: ctx.policy.maxOrdersSource,
        used: ctx.ordersUsed,
        remaining: ctx.ordersRemaining,
      },
      maxPerOrder: {
        override: ctx.policy.maxPerOrderOverride,
        default: ctx.policy.maxPerOrderDefault,
        effective: ctx.policy.maxPerOrderMinor,
        source: ctx.policy.maxPerOrderSource,
      },
    };
  }

  async getOwnSummary(userId: string) {
    const family = await this.families.findByUserId(userId);
    if (!family || family.role !== "family") {
      HttpError.notFound("Family budget not found");
    }
    const month = currentMonth();
    const account = await this.validator.ensureAccountForFamily(family.id);
    const funding = await this.funding.getProgress(family.id);
    const ctx = await this.buildPolicyContext(account, month);
    const monthlyLimit = ctx.monthlyOverride
      ? { month: ctx.monthlyOverride.month, limitMinor: ctx.monthlyOverride.limitMinor }
      : null;
    return {
      currency: account.currency,
      availableMinor: account.availableMinor,
      reservedMinor: account.reservedMinor,
      spentMinor: account.spentMinor,
      version: account.version,
      monthlyLimit,
      funding,
      month,
      monthlyUsedMinor: ctx.monthlyUsedMinor,
      monthlyLimitMinor: ctx.policy.monthlyLimitMinor,
      ordersUsed: ctx.ordersUsed,
      ordersLimit: ctx.policy.maxOrders,
      ordersRemaining: ctx.ordersRemaining,
      maxPerOrderMinor: ctx.policy.maxPerOrderMinor,
    };
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
    const account = await this.accounts.lockByFamilyId(familyProfileId);
    if (!account) {
      HttpError.notFound("Budget account not found");
    }
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
  async resetMonthlyLimit(
    familyProfileId: string,
    data: ResetMonthlyBudgetLimitDto,
    actorUserId: string,
  ) {
    const input = resetMonthlyBudgetLimitDto.parse(data);
    const account = await this.accounts.lockByFamilyId(familyProfileId);
    if (!account) {
      HttpError.notFound("Budget account not found");
    }
    const deleted = await this.limits.reset({
      budgetAccountId: account.id,
      month: input.month,
    });
    await this.audits.record({
      action: "budget.monthlyLimitReset",
      actorUserId,
      metadata: {
        month: input.month,
        reason: input.reason,
        removed: Boolean(deleted),
      },
      resource: "monthlyBudgetLimits",
      resourceId: deleted?.id ?? account.id,
    });
    const policy = await this.resolvePolicyForLockedAccount(
      {
        id: account.id,
        maxOrdersPerMonth: account.maxOrdersPerMonth ?? null,
        maxBudgetPerOrderMinor: account.maxBudgetPerOrderMinor ?? null,
      },
      input.month,
    );
    return {
      reset: true,
      removed: Boolean(deleted),
      month: input.month,
      effectiveMonthlyLimitMinor: policy.monthlyLimitMinor,
      source: policy.monthlySource,
    };
  }

  @Transaction({ retries: 2 })
  async setOrderPolicy(
    familyProfileId: string,
    data: SetFamilyOrderPolicyDto,
    actorUserId: string,
  ) {
    const input = setFamilyOrderPolicyDto.parse(data);
    const locked = await this.accounts.lockByFamilyId(familyProfileId);
    if (!locked) {
      HttpError.notFound("Budget account not found");
    }
    const before = {
      maxOrdersPerMonth: locked.maxOrdersPerMonth ?? null,
      maxBudgetPerOrderMinor: locked.maxBudgetPerOrderMinor ?? null,
    };
    const patch: {
      maxOrdersPerMonth?: number | null;
      maxBudgetPerOrderMinor?: number | null;
    } = {};
    if (input.maxOrdersPerMonth !== undefined) {
      patch.maxOrdersPerMonth = input.maxOrdersPerMonth ?? null;
    }
    if (input.maxBudgetPerOrderMinor !== undefined) {
      patch.maxBudgetPerOrderMinor = input.maxBudgetPerOrderMinor ?? null;
    }
    const updated = await this.accounts.updatePolicy(locked.id, patch);
    if (!updated) {
      HttpError.notFound("Budget account not found");
    }
    const after = {
      maxOrdersPerMonth: updated.maxOrdersPerMonth ?? null,
      maxBudgetPerOrderMinor: updated.maxBudgetPerOrderMinor ?? null,
    };
    await this.audits.record({
      action: "budget.orderPolicyUpdated",
      actorUserId,
      metadata: {
        before,
        after,
        reason: input.reason,
      },
      resource: "budgetAccounts",
      resourceId: updated.id,
    });
    return updated;
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
