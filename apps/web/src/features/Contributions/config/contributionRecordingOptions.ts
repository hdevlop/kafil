import type { ContributionRecordingOption } from "../types";

export interface RecordingOptionView {
  disabled: boolean;
  disabledReason: string | null;
  funding: ContributionRecordingOption["funding"];
  label: string;
  maxAmountMinor: number;
  value: string;
}

export function buildContributionRecordingOptions(
  assignments: ContributionRecordingOption[] | undefined,
  familyProfileId?: string,
  closedReasons?: Readonly<{ funded: string; reserved: string }>,
): RecordingOptionView[] {
  if (!assignments) return [];
  return assignments
    .filter(
      (assignment) =>
        !familyProfileId || assignment.familyProfileId === familyProfileId,
    )
    .map((assignment) => {
      const funding = assignment.funding ?? null;
      const maxAmountMinor = funding?.availableToContributeMinor ?? 0;
      const closed =
        funding?.capacityStatus === "funded" ||
        funding?.capacityStatus === "reserved";
      return {
        value: assignment.id,
        label: familyProfileId
          ? `${assignment.sponsorName} (${assignment.sponsorEmail})`
          : `${assignment.sponsorName} — ${assignment.familyName} (${assignment.sponsorEmail})`,
        funding,
        maxAmountMinor,
        disabled: closed,
        disabledReason:
          closed && closedReasons
            ? closedReasons[
                funding?.capacityStatus === "funded" ? "funded" : "reserved"
              ]
            : null,
      };
    });
}
