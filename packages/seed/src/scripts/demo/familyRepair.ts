import type { DemoFamily } from "./generator";

export function familyIntakeNeedsRepair(
  desired: DemoFamily,
  stored:
    | {
        deliveryLatitude: number | null;
        deliveryLongitude: number | null;
        exactAddress: string;
        housingSituation: string;
        registrationDate: string;
        supportPriority: string;
      }
    | undefined,
) {
  if (!stored) return true;
  return (
    stored.exactAddress !== desired.exactAddress ||
    stored.deliveryLatitude !== desired.deliveryLatitude ||
    stored.deliveryLongitude !== desired.deliveryLongitude ||
    stored.housingSituation !== desired.housingSituation ||
    stored.registrationDate !== desired.registrationDate ||
    stored.supportPriority !== desired.supportPriority
  );
}
