import { Operator } from "@/shared/Authorization";

import type { FamilyRecord } from "../../types";

import { FamilyDetailsContributions } from "./FamilyDetailsContributions";
import { FamilyDetailsHero } from "./FamilyDetailsHero";
import { FamilyDetailsProfile } from "./FamilyDetailsProfile";

export function FamilyDetails({ family }: Readonly<{ family: FamilyRecord }>) {
  return (
    <div className="grid gap-3 lg:grid-cols-2 lg:gap-0 lg:divide-x lg:divide-border/70">
      <div className="space-y-3 lg:pr-4">
        <FamilyDetailsHero family={family} />
        <Operator>
          <FamilyDetailsContributions family={family} />
        </Operator>
      </div>
      <div className="space-y-3 lg:pl-4">
        <FamilyDetailsProfile family={family} />
      </div>
    </div>
  );
}
