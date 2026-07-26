"use client";

import { CircleDollarSign } from "lucide-react";
import { NButton, NCard, NPageLayout } from "najm-kit";
import { useState } from "react";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { formatKafilDate, formatMad } from "@/lib/format";
import { FundingProgressBar } from "@/shared/FundingProgressCard";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { PageEmptyState } from "@/shared/PageState";
import { DashboardPageHeader as NPageHeader } from "@/shared/DashboardShell/DashboardPageHeader";
import { StatusBadge } from "@/shared/StatusBadge";

import {
  useSponsorContributionCommands,
  useSponsorContributions,
  useSponsorFamilyCatalog,
  useSponsorPlans,
  useSponsorSupport,
} from "../hooks/useSponsorWorkspace";

function parseMad(value: string) {
  const amount = Number(value.replace(",", "."));
  return Number.isFinite(amount) && amount > 0
    ? Math.round(amount * 100)
    : null;
}

export function SponsorContributionsPage({
  initialAssignmentId = "",
}: Readonly<{ initialAssignmentId?: string }>) {
  const [assignmentId, setAssignmentId] = useState(initialAssignmentId);
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState<"monthly" | "one_time">("monthly");
  const { t } = useKafilLanguage();
  const support = useSponsorSupport();
  const catalog = useSponsorFamilyCatalog();
  const plans = useSponsorPlans({ limit: 50, offset: 0 });
  const contributions = useSponsorContributions({ limit: 50, offset: 0 });
  const commands = useSponsorContributionCommands();
  const minor = parseMad(amount);
  const active = support.data?.filter(
    (item) => item.assignment.status === "active",
  ) ?? [];
  const selectedAssignment = active.find(
    (item) => item.assignment.id === assignmentId,
  );
  const selectedFunding = catalog.data?.find(
    (family) => family.id === selectedAssignment?.assignment.familyProfileId,
  )?.funding;
  const closedByFunding =
    selectedFunding?.capacityStatus === "funded" ||
    selectedFunding?.capacityStatus === "reserved";
  const amountTooHigh = Boolean(
    minor &&
      selectedFunding &&
      minor > selectedFunding.availableToContributeMinor,
  );
  const canContribute = Boolean(
    assignmentId && minor && !closedByFunding && !amountTooHigh,
  );

  async function createPlan() {
    if (!canContribute || !minor) return;
    await commands.createPlan.mutateAsync({
      supportAssignmentId: assignmentId,
      amountMinor: minor,
      kind,
    });
  }

  async function submit() {
    if (!canContribute || !minor) return;
    await commands.submit.mutateAsync({
      supportAssignmentId: assignmentId,
      amountMinor: minor,
      paymentMethod: "manual",
    });
  }

  return (
    <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
      <NPageHeader
        actions={<PageHeaderGlobalActions />}
        icon={CircleDollarSign}
        title={t("sponsor.contributions.title")}
        subtitle={t("sponsor.contributions.subtitle")}
      />
      <NCard title={t("sponsor.contributions.createTitle")}>
        <div className="grid gap-3 sm:grid-cols-3">
          <select
            aria-label={t("sponsor.contributions.chooseSupport")}
            className="h-10 rounded-lg border border-input bg-background px-3"
            value={assignmentId}
            onChange={(event) => setAssignmentId(event.target.value)}
          >
            <option value="">{t("sponsor.contributions.chooseSupport")}</option>
            {active.map((item) => {
              const funding = catalog.data?.find(
                (family) => family.id === item.assignment.familyProfileId,
              )?.funding;
              const closed =
                funding?.capacityStatus === "funded" ||
                funding?.capacityStatus === "reserved";
              return (
                <option
                  disabled={closed}
                  key={item.assignment.id}
                  value={item.assignment.id}
                >
                  {item.target.label}
                </option>
              );
            })}
          </select>
          <input
            aria-label={t("sponsor.contributions.amount")}
            className="h-10 rounded-lg border border-input bg-background px-3"
            inputMode="decimal"
            max={
              selectedFunding
                ? selectedFunding.availableToContributeMinor / 100
                : undefined
            }
            min="0.01"
            placeholder={t("sponsor.contributions.amount")}
            step="0.01"
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <select
            aria-label={t("sponsor.contributions.monthlyPlan")}
            className="h-10 rounded-lg border border-input bg-background px-3"
            value={kind}
            onChange={(event) =>
              setKind(event.target.value as "monthly" | "one_time")
            }
          >
            <option value="monthly">
              {t("sponsor.contributions.monthlyPlan")}
            </option>
            <option value="one_time">
              {t("sponsor.contributions.oneTimePlan")}
            </option>
          </select>
        </div>
        {selectedFunding ? (
          <div className="mt-3 space-y-2 rounded-lg bg-muted/40 p-3">
            <FundingProgressBar inline progress={selectedFunding} />
            {closedByFunding ? (
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                {t(
                  selectedFunding.capacityStatus === "funded"
                    ? "sponsor.contributions.targetReached"
                    : "sponsor.contributions.coveredByPending",
                )}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("sponsor.contributions.availableAmount", {
                  amount: formatMad(
                    selectedFunding.availableToContributeMinor,
                  ),
                })}
              </p>
            )}
            {amountTooHigh ? (
              <p className="text-sm font-medium text-destructive">
                {t("sponsor.contributions.amountTooHigh", {
                  amount: formatMad(
                    selectedFunding.availableToContributeMinor,
                  ),
                })}
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <NButton
            disabled={!canContribute || commands.createPlan.isPending}
            onClick={() => void createPlan()}
          >
            {t("action.createPlan")}
          </NButton>
          <NButton
            variant="outline"
            disabled={!canContribute || commands.submit.isPending}
            onClick={() => void submit()}
          >
            {t("action.submitContribution")}
          </NButton>
        </div>
      </NCard>
      <div className="grid gap-4 lg:grid-cols-2">
        <NCard title={t("sponsor.contributions.plans")}>
          {plans.data?.length ? (
            <div className="space-y-3">
              {plans.data.map((plan) => (
                <div className="border-t border-border pt-3" key={plan.id}>
                  <div className="flex justify-between">
                    <span>
                      {plan.kind === "monthly"
                        ? t("sponsor.contributions.monthly")
                        : t("sponsor.contributions.oneTime")}
                      {" - "}
                      {formatMad(plan.amountMinor)}
                    </span>
                    <StatusBadge status={plan.status} />
                  </div>
                  {plan.status !== "stopped" ? (
                    <div className="mt-2 flex gap-2">
                      <NButton
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const reason = window.prompt(
                            t("sponsor.contributions.planReason"),
                          );
                          if (reason) {
                            void commands.changePlan.mutateAsync({
                              id: plan.id,
                              action:
                                plan.status === "active" ? "pause" : "resume",
                              reason,
                            });
                          }
                        }}
                      >
                        {plan.status === "active"
                          ? t("action.pause")
                          : t("action.resume")}
                      </NButton>
                      <NButton
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const reason = window.prompt(
                            t("sponsor.contributions.stopReason"),
                          );
                          if (reason) {
                            void commands.changePlan.mutateAsync({
                              id: plan.id,
                              action: "stop",
                              reason,
                            });
                          }
                        }}
                      >
                        {t("action.stop")}
                      </NButton>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("sponsor.contributions.none")}
            </p>
          )}
        </NCard>
        <NCard title={t("sponsor.contributions.history")}>
          {contributions.data?.length ? (
            <div className="space-y-3">
              {contributions.data.map((contribution) => (
                <div className="border-t border-border pt-3" key={contribution.id}>
                  <div className="flex justify-between">
                    <span className="font-medium">
                      {formatMad(contribution.amountMinor)}
                    </span>
                    <StatusBadge status={contribution.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {contribution.paymentMethod}
                    {" - "}
                    {formatKafilDate(contribution.submittedAt)}
                  </p>
                  {contribution.status === "pending" &&
                  contribution.expiresAt ? (
                    <p className="text-xs text-muted-foreground">
                      {t("sponsor.contributions.pendingDeadline", {
                        date: formatKafilDate(contribution.expiresAt),
                      })}
                    </p>
                  ) : null}
                  {contribution.status === "expired" &&
                  contribution.expiredAt ? (
                    <p className="text-xs text-muted-foreground">
                      {t("sponsor.contributions.expiredAt", {
                        date: formatKafilDate(contribution.expiredAt),
                      })}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <PageEmptyState
              title={t("sponsor.contributions.emptyTitle")}
              description={t("sponsor.contributions.emptyDescription")}
            />
          )}
        </NCard>
      </div>
    </NPageLayout>
  );
}
