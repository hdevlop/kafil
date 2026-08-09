"use client";

import { HandCoins, MessageSquareText } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  FormInput,
  NButton,
  NCard,
  NForm,
  NFormSectionHeader,
  useDialog,
  useDebouncedValue,
  useNajmFormat,
  useNForm,
} from "najm-kit";
import { z } from "zod";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import { useKafilRole } from "@/shared/Authorization";
import { FundingProgressBar } from "@/shared/FundingProgressCard";
import { StatusBadge } from "@/shared/StatusBadge";

import { useSponsorContributionWorkspace } from "../hooks/useSponsorContributionWorkspace";
import type { SponsorContributionPlan } from "../lib/sponsorTypes";

const sponsorContributionSchema = z.object({
  supportAssignmentId: z.string().min(1),
  amountMad: z.coerce.number().positive().max(1_000_000),
  kind: z.enum(["monthly", "one_time"]),
  paymentMethod: z.enum([
    "cash",
    "bank_transfer",
    "cheque",
    "mobile_transfer",
    "other",
  ]),
});

const planReasonSchema = z.object({ reason: z.string().trim().min(1).max(500) });

type SponsorContributionValues = z.infer<typeof sponsorContributionSchema>;
type PlanAction = "pause" | "resume" | "stop";

function ContributionFormSurface({
  children,
  title,
  withCard,
}: Readonly<{
  children: ReactNode;
  title: ReactNode;
  withCard: boolean;
}>) {
  if (!withCard) return children;
  return <NCard title={title}>{children}</NCard>;
}

function toMinor(amountMad: number) {
  return Math.round(amountMad * 100);
}

function PlanReasonDialogContent({
  action,
  plan,
}: Readonly<{ action: PlanAction; plan: SponsorContributionPlan }>) {
  const { t } = useKafilLanguage();
  const { pop } = useDialog();
  const { isExactSponsor } = useKafilRole();
  const workspace = useSponsorContributionWorkspace(isExactSponsor);

  async function handleSubmit(values: z.infer<typeof planReasonSchema>) {
    await workspace.changePlan.mutateAsync({ id: plan.id, action, ...values });
    await pop();
  }

  return (
    <NForm
      id={`sponsor-plan-${action}-form`}
      schema={planReasonSchema}
      defaultValues={{ reason: "" }}
      onSubmit={handleSubmit}
    >
      <FormInput
        name="reason"
        type="textarea"
        formLabel={t(
          action === "stop"
            ? "sponsor.contributions.stopReason"
            : "sponsor.contributions.planReason",
        )}
        icon="MessageSquareText"
        required
      />
      <div className="flex justify-end pt-4">
        <NButton type="submit" disabled={workspace.changePlan.isPending}>
          {t(`action.${action}` as "action.pause")}
        </NButton>
      </div>
    </NForm>
  );
}

export function SponsorContributionWorkspace({
  initialAssignmentId = "",
  hideFunding = false,
  lockAssignment = false,
  onCompleted,
  showPlans = true,
}: Readonly<{
  initialAssignmentId?: string;
  hideFunding?: boolean;
  lockAssignment?: boolean;
  onCompleted?: () => void;
  showPlans?: boolean;
}>) {
  const { t } = useKafilLanguage();
  const fmt = useNajmFormat();
  const dialog = useDialog();
  const { isExactSponsor } = useKafilRole();
  const [supportSearch, setSupportSearch] = useState("");
  const workspace = useSponsorContributionWorkspace(
    isExactSponsor,
    useDebouncedValue(supportSearch, 250),
  );
  const form = useNForm({
    schema: sponsorContributionSchema,
    defaultValues: {
      supportAssignmentId: initialAssignmentId,
      amountMad: 0,
      kind: "monthly",
      paymentMethod: "bank_transfer",
    },
  });
  const assignmentId = form.watch("supportAssignmentId");
  const amountMinor = toMinor(Number(form.watch("amountMad") || 0));
  const active = workspace.catalog.data?.filter((family) => family.assignmentId) ?? [];
  const selectedFamily = active.find((family) => family.assignmentId === assignmentId);
  const selectedFunding = selectedFamily?.funding;
  const closedByFunding =
    selectedFunding?.capacityStatus === "funded" ||
    selectedFunding?.capacityStatus === "reserved";
  const amountTooHigh = Boolean(
    amountMinor > 0 &&
      selectedFunding &&
      amountMinor > selectedFunding.availableToContributeMinor,
  );
  const commandDisabled =
    !isExactSponsor || closedByFunding || amountTooHigh || amountMinor <= 0;

  const supportOptions = active.map((family) => {
    const funding = family.funding;
    const closed =
      funding?.capacityStatus === "funded" ||
      funding?.capacityStatus === "reserved";
    return {
      value: family.assignmentId!,
      label: `${family.reference} · ${family.activeChildCount}`,
      disabled: closed,
    };
  });

  async function submit(values: SponsorContributionValues) {
    if (commandDisabled) return;
    await workspace.submit.mutateAsync({
      supportAssignmentId: values.supportAssignmentId,
      amountMinor: toMinor(values.amountMad),
      paymentMethod: values.paymentMethod,
    });
    onCompleted?.();
  }

  async function createPlan() {
    if (!(await form.trigger()) || commandDisabled) return;
    const values = form.getValues();
    await workspace.createPlan.mutateAsync({
      supportAssignmentId: values.supportAssignmentId,
      amountMinor: toMinor(values.amountMad),
      kind: values.kind,
    });
    onCompleted?.();
  }

  function openPlanAction(plan: SponsorContributionPlan, action: PlanAction) {
    void dialog.openDialog({
      title: t(`action.${action}` as "action.pause"),
      description: t(
        action === "stop"
          ? "sponsor.contributions.stopReason"
          : "sponsor.contributions.planReason",
      ),
      children: <PlanReasonDialogContent action={action} plan={plan} />,
      showButtons: false,
      size: "sm",
    });
  }

  return (
    <div
      className={
        showPlans
          ? "grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]"
          : "min-w-0"
      }
    >
      <ContributionFormSurface
        title={t("sponsor.contributions.createTitle")}
        withCard={showPlans}
      >
        <NForm
          id="sponsor-contribution-form"
          schema={sponsorContributionSchema}
          form={form}
          onSubmit={submit}
        >
          {showPlans ? (
            <NFormSectionHeader
              icon={HandCoins}
              title={t("sponsor.contributions.createTitle")}
            />
          ) : null}
          {!hideFunding && lockAssignment && selectedFunding ? (
            <div className="space-y-2 bg-muted/40 p-3">
              <FundingProgressBar inline progress={selectedFunding} />
              <p
                className={
                  amountTooHigh || closedByFunding
                    ? "text-sm font-medium text-destructive"
                    : "text-sm text-muted-foreground"
                }
              >
                {closedByFunding
                  ? t(
                      selectedFunding.capacityStatus === "funded"
                        ? "sponsor.contributions.targetReached"
                        : "sponsor.contributions.coveredByPending",
                    )
                  : amountTooHigh
                    ? t("sponsor.contributions.amountTooHigh", {
                        amount: fmt.money(
                          selectedFunding.availableToContributeMinor,
                        ),
                      })
                    : t("sponsor.contributions.availableAmount", {
                        amount: fmt.money(selectedFunding.availableToContributeMinor),
                      })}
              </p>
            </div>
          ) : null}
          <div
            className={
              lockAssignment
                ? "grid grid-cols-1 gap-4"
                : "grid gap-4 md:grid-cols-3"
            }
          >
            {!lockAssignment ? (
              <FormInput
                name="supportAssignmentId"
                type="combobox"
                formLabel={t("sponsor.contributions.chooseSupport")}
                placeholder={t("sponsor.contributions.chooseSupport")}
                searchPlaceholder={t("sponsor.contributions.chooseSupport")}
                emptyMessage={t("sponsor.contributions.none")}
                loading={workspace.catalog.isFetching}
                loadingMessage={t("state.loading")}
                onSearchChange={setSupportSearch}
                shouldFilter={false}
                items={supportOptions}
                icon="HeartHandshake"
                disabled={!isExactSponsor || workspace.catalog.isPending}
                required
              />
            ) : null}
            <FormInput
              name="amountMad"
              type="number"
              formLabel={t("sponsor.contributions.amount")}
              icon="CircleDollarSign"
              disabled={!isExactSponsor}
              required
            />
            {lockAssignment ? (
              <FormInput
                name="paymentMethod"
                type="select"
                formLabel={t("operator.contributions.paymentMethod")}
                items={[
                  { value: "cash", label: t("operator.contributions.cash") },
                  {
                    value: "bank_transfer",
                    label: t("operator.contributions.bankTransfer"),
                  },
                  { value: "cheque", label: t("operator.contributions.cheque") },
                  {
                    value: "mobile_transfer",
                    label: t("operator.contributions.mobileTransfer"),
                  },
                  { value: "other", label: t("operator.contributions.other") },
                ]}
                icon="CreditCard"
                disabled={!isExactSponsor}
                required
              />
            ) : null}
            {!lockAssignment ? (
              <FormInput
                name="kind"
                type="select"
                formLabel={t("sponsor.contributions.monthlyPlan")}
                items={[
                  {
                    value: "monthly",
                    label: t("sponsor.contributions.monthlyPlan"),
                  },
                  {
                    value: "one_time",
                    label: t("sponsor.contributions.oneTimePlan"),
                  },
                ]}
                icon="CalendarClock"
                disabled={!isExactSponsor}
                required
              />
            ) : null}
          </div>
          {!hideFunding && !lockAssignment && selectedFunding ? (
            <div className="space-y-2 bg-muted/40 p-3">
              <FundingProgressBar inline progress={selectedFunding} />
              <p
                className={
                  amountTooHigh || closedByFunding
                    ? "text-sm font-medium text-destructive"
                    : "text-sm text-muted-foreground"
                }
              >
                {closedByFunding
                  ? t(
                      selectedFunding.capacityStatus === "funded"
                        ? "sponsor.contributions.targetReached"
                        : "sponsor.contributions.coveredByPending",
                    )
                  : amountTooHigh
                    ? t("sponsor.contributions.amountTooHigh", {
                        amount: fmt.money(
                          selectedFunding.availableToContributeMinor,
                        ),
                      })
                    : t("sponsor.contributions.availableAmount", {
                        amount: fmt.money(selectedFunding.availableToContributeMinor),
                      })}
              </p>
            </div>
          ) : null}
          <div
            className={
              lockAssignment
                ? "pt-4"
                : "flex flex-wrap justify-end gap-2 pt-4"
            }
          >
            {!lockAssignment ? (
              <NButton
                type="button"
                variant="outline"
                disabled={commandDisabled || workspace.createPlan.isPending}
                onClick={() => void createPlan()}
              >
                {t("action.createPlan")}
              </NButton>
            ) : null}
            <NButton
              className={lockAssignment ? "w-full" : undefined}
              type="submit"
              disabled={commandDisabled || workspace.submit.isPending}
            >
              {t("action.submitContribution")}
            </NButton>
          </div>
        </NForm>
      </ContributionFormSurface>

      {showPlans ? <NCard title={t("sponsor.contributions.plans")}>
        {workspace.plans.rows.length ? (
          <div className="space-y-3">
            {workspace.plans.rows.map((plan) => (
              <div className="space-y-2 border-t border-border pt-3 first:border-t-0 first:pt-0" key={plan.id}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">
                    {t(
                      plan.kind === "monthly"
                        ? "sponsor.contributions.monthly"
                        : "sponsor.contributions.oneTime",
                    )}
                    {" · "}
                    {fmt.money(plan.amountMinor)}
                  </span>
                  <StatusBadge status={plan.status} />
                </div>
                {plan.status !== "stopped" && isExactSponsor ? (
                  <div className="flex flex-wrap gap-2">
                    <NButton
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        openPlanAction(
                          plan,
                          plan.status === "active" ? "pause" : "resume",
                        )
                      }
                    >
                      {t(
                        plan.status === "active" ? "action.pause" : "action.resume",
                      )}
                    </NButton>
                    <NButton
                      size="sm"
                      variant="outline"
                      leftIcon={MessageSquareText}
                      onClick={() => openPlanAction(plan, "stop")}
                    >
                      {t("action.stop")}
                    </NButton>
                  </div>
                ) : null}
              </div>
            ))}
            {workspace.plans.hasNextPage ? (
              <NButton
                className="w-full"
                disabled={workspace.plans.isFetchingNextPage}
                onClick={() => void workspace.plans.fetchNextPage()}
                type="button"
                variant="outline"
              >
                {workspace.plans.isFetchingNextPage ? t("state.loading") : t("common.loadMore")}
              </NButton>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("sponsor.contributions.none")}
          </p>
        )}
      </NCard> : null}
    </div>
  );
}
