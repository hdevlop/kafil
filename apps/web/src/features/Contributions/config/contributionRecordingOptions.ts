import type { ContributionRecordingOption } from "../types";

export function buildContributionRecordingOptions(
  assignments: ContributionRecordingOption[] | undefined,
  familyProfileId?: string,
) {
  return (
    assignments
      ?.filter(
        (assignment) =>
          !familyProfileId || assignment.familyProfileId === familyProfileId,
      )
      .map((assignment) => ({
        value: assignment.id,
        label: familyProfileId
          ? `${assignment.sponsorName} (${assignment.sponsorEmail})`
          : `${assignment.sponsorName} — ${assignment.familyName} (${assignment.sponsorEmail})`,
      })) ?? []
  );
}
