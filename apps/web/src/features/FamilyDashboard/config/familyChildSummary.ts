import type { FamilyChildRecord } from "../types";

export function getFamilyChildStatusCounts(children: FamilyChildRecord[]) {
  return children.reduce(
    (counts, child) => {
      counts.total += 1;
      if (child.status === "active") counts.active += 1;
      else counts.inactive += 1;
      return counts;
    },
    { total: 0, active: 0, inactive: 0 },
  );
}
