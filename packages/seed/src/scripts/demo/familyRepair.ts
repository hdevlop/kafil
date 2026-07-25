import type { DemoFamily } from "./generator";

export function familyIntakeNeedsRepair(
  desired: DemoFamily,
  stored:
    | {
        housingSituation: string;
        registrationDate: string;
        supportPriority: string;
      }
    | undefined,
) {
  if (!stored) return true;
  return (
    stored.housingSituation !== desired.housingSituation ||
    stored.registrationDate !== desired.registrationDate ||
    stored.supportPriority !== desired.supportPriority
  );
}
