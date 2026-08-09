import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { buildSponsorFamilyViews } from "../src/features/Families/lib/buildSponsorFamilyViews";

const family = {
  id: "00000000-0000-4000-8000-102000000001",
  name: "Karima Iraqi",
  image: "/api/family-images/files/serve/family-1.webp",
  supportPriority: "normal" as const,
  reference: "KF-00000001",
  activeChildCount: 2,
  activeSponsorCount: 4,
  assignmentId: null,
  funding: null,
};

describe("sponsor Families projection", () => {
  test("projects the server-owned relationship without a second list", () => {
    expect(buildSponsorFamilyViews([family])).toEqual([
      {
        ...family,
        assignmentId: null,
        relationship: "available",
      },
    ]);

    expect(buildSponsorFamilyViews([{ ...family, assignmentId: "assignment-1" }])).toEqual([
      {
        ...family,
        assignmentId: "assignment-1",
        relationship: "supported",
      },
    ]);
  });

  test("treats a catalog row without an active assignment as available", () => {
    const [view] = buildSponsorFamilyViews([family]);

    expect(view?.relationship).toBe("available");
    expect(view?.assignmentId).toBeNull();
  });

  test("reuses FamilyCard without authorization wrappers or a sponsor duplicate", () => {
    const cardSource = readFileSync(
      new URL(
        "../src/features/Families/components/FamilyCard/FamilyCard.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    const tableSource = readFileSync(
      new URL(
        "../src/features/Families/hooks/useSponsorFamiliesTableProps.tsx",
        import.meta.url,
      ),
      "utf8",
    );

    expect(tableSource).toContain('import { FamilyCard }');
    expect(tableSource).toContain("<FamilyCard data={data} onContribute={onContribute} />");
    expect(cardSource).not.toContain("<Operator>");
    expect(cardSource).not.toContain("<OnlySponsor>");
    expect(cardSource).not.toContain("@/shared/Authorization");
    expect(cardSource).toContain('src={getPersonImage({ image: data.image, role: "family" })}');
    expect(cardSource).toContain("{data.name}");
    expect(cardSource).toContain("value={data.activeSponsorCount}");
    expect(cardSource).toContain("<SponsorFamilyAction");
    expect(cardSource).not.toContain("<NSheet");
    expect(cardSource).not.toContain("router.push");
    expect(cardSource).toContain("onContribute?.(data, assignment.id)");
    expect(cardSource).toContain('sponsorFamily?.relationship === "supported"');
    expect(cardSource).toContain('<SupportedFamilyIcon className="!size-[22px]');
    expect(cardSource).toContain('<svg viewBox="0 0 24 24"');
    expect(cardSource).toContain('className="absolute end-3 top-3');
    expect(cardSource).toContain(
      'sponsorFamily ? "translate-y-16 sm:translate-y-0"',
    );
    expect(cardSource).toContain('aria-label={t("sponsor.directory.mySupport")}');
  });
});
