import { Body, Controller, Get, Params, Post, Put, Query, User,
  ResMsg,
} from "najm-core";
import { McpTool, ToolGroup } from "najm-mcp";
import { Validate } from "najm-validation";

import { isFamily, isOperator } from "../../config/authConfig";
import {
  type BudgetLedgerListQuery,
  budgetFamilyIdParams,
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
import { Budget, CanRead, CanUpdate, Policy } from "./budgetGuards";
import { BudgetService } from "./budgetService";

@ToolGroup("budgets")
@Policy(Budget)
@Controller("/budgets")
export class BudgetController {
  constructor(private readonly budgets: BudgetService) {}

  @Get("/me")
  @isFamily()
  @CanRead("budgets")
  @McpTool({
    description: "Read the authenticated family's budget summary",
    readOnly: true,
  })
  @ResMsg("budgets.success.retrieved")
  getOwnSummary(@User("id") userId: string) {
    return this.budgets.getOwnSummary(userId);
  }

  @Get("/me/ledger")
  @isFamily()
  @CanRead("budgets")
  @Validate({ query: budgetLedgerListQuery })
  @McpTool({
    description: "Read the authenticated family's own budget ledger",
    readOnly: true,
  })
  @ResMsg("budgets.success.retrieved")
  listOwnLedger(
    @User("id") userId: string,
    @Query() query: BudgetLedgerListQuery,
  ) {
    return this.budgets.listOwnLedger(userId, query);
  }

  @Get("/:familyProfileId")
  @isOperator()
  @CanRead()
  @Validate({ params: budgetFamilyIdParams })
  @McpTool({
    description: "Read an operator-managed household budget summary",
    readOnly: true,
  })
  @ResMsg("budgets.success.retrieved")
  getSummary(@Params("familyProfileId") familyProfileId: string) {
    return this.budgets.getSummary(familyProfileId);
  }

  @Get("/:familyProfileId/ledger")
  @isOperator()
  @CanRead()
  @Validate({ params: budgetFamilyIdParams, query: budgetLedgerListQuery })
  @McpTool({
    description: "Read an operator-managed household budget ledger",
    readOnly: true,
  })
  @ResMsg("budgets.success.retrieved")
  listLedger(
    @Params("familyProfileId") familyProfileId: string,
    @Query() query: BudgetLedgerListQuery,
  ) {
    return this.budgets.listLedger(familyProfileId, query);
  }

  @Get("/:familyProfileId/reconciliation")
  @isOperator()
  @CanRead()
  @Validate({ params: budgetFamilyIdParams })
  @McpTool({
    description: "Compare a household budget account with its latest ledger balance",
    readOnly: true,
  })
  @ResMsg("budgets.success.reconciled")
  reconcile(@Params("familyProfileId") familyProfileId: string) {
    return this.budgets.reconcile(familyProfileId);
  }

  @Put("/:familyProfileId/monthly-limit")
  @isOperator()
  @CanUpdate()
  @Validate({
    body: setMonthlyBudgetLimitDto,
    params: budgetFamilyIdParams,
  })
  @McpTool({
    description: "Set an operator-managed monthly household budget limit",
    confirm: {
      level: "warning",
      message: "Set this household's monthly budget limit?",
    },
  })
  @ResMsg("budgets.success.monthlyLimitUpdated")
  setMonthlyLimit(
    @Params("familyProfileId") familyProfileId: string,
    @Body() body: SetMonthlyBudgetLimitDto,
    @User("id") actorUserId: string,
  ) {
    return this.budgets.setMonthlyLimit(
      familyProfileId,
      body,
      actorUserId,
    );
  }

  @Post("/:familyProfileId/monthly-limit/reset")
  @isOperator()
  @CanUpdate()
  @Validate({
    body: resetMonthlyBudgetLimitDto,
    params: budgetFamilyIdParams,
  })
  @McpTool({
    description:
      "Reset a household monthly budget override to inherit the global default",
    confirm: {
      level: "warning",
      message: "Reset this household's monthly budget override?",
    },
  })
  @ResMsg("budgets.success.monthlyLimitReset")
  resetMonthlyLimit(
    @Params("familyProfileId") familyProfileId: string,
    @Body() body: ResetMonthlyBudgetLimitDto,
    @User("id") actorUserId: string,
  ) {
    return this.budgets.resetMonthlyLimit(familyProfileId, body, actorUserId);
  }

  @Put("/:familyProfileId/order-policy")
  @isOperator()
  @CanUpdate()
  @Validate({
    body: setFamilyOrderPolicyDto,
    params: budgetFamilyIdParams,
  })
  @McpTool({
    description:
      "Set per-family order count and per-order ceiling overrides (null inherits global)",
    confirm: {
      level: "warning",
      message: "Set this household's order policy overrides?",
    },
  })
  @ResMsg("budgets.success.orderPolicyUpdated")
  setOrderPolicy(
    @Params("familyProfileId") familyProfileId: string,
    @Body() body: SetFamilyOrderPolicyDto,
    @User("id") actorUserId: string,
  ) {
    return this.budgets.setOrderPolicy(familyProfileId, body, actorUserId);
  }

  @Post("/:familyProfileId/adjustments")
  @isOperator()
  @CanUpdate()
  @Validate({
    body: manualBudgetAdjustmentDto,
    params: budgetFamilyIdParams,
  })
  @McpTool({
    description: "Apply an audited, idempotent manual household budget adjustment",
    idempotent: true,
    confirm: {
      level: "danger",
      message: "Apply this manual budget adjustment?",
    },
  })
  @ResMsg("budgets.success.adjusted")
  adjust(
    @Params("familyProfileId") familyProfileId: string,
    @Body() body: ManualBudgetAdjustmentDto,
    @User("id") actorUserId: string,
  ) {
    return this.budgets.adjust(familyProfileId, body, actorUserId);
  }
}
