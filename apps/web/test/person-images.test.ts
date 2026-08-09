import { describe, expect, test } from "bun:test";

import { getPersonImage } from "najm-kit/person-images";

import { parentGenderFromRelationship } from "../src/features/Dashboard/FamilyDashboard/lib/parentGenderFromRelationship";

const managedChildImage =
  "/api/child-images/files/serve/00000000-0000-4000-8000-000000000050.png";
const managedAdultImage =
  "/api/people/files/serve/00000000-0000-4000-8000-000000000051.png";

describe("Kafil person-image mapping", () => {
  test("female and male children map to the gender-specific child fallback", () => {
    const female = getPersonImage({ image: null, role: "child", gender: "F" });
    const male = getPersonImage({ image: null, role: "child", gender: "M" });
    expect(female.startsWith("data:image/webp;base64,")).toBe(true);
    expect(male.startsWith("data:image/webp;base64,")).toBe(true);
    expect(female).not.toBe(male);
  });

  test("the neutral family role never swings to a personal variant", () => {
    const neutral = getPersonImage({ image: null, role: "family" });
    expect(neutral.startsWith("data:image/webp;base64,")).toBe(true);
    expect(getPersonImage({ image: null, role: "family", gender: "F" })).toBe(neutral);
    expect(getPersonImage({ image: null, role: "family", gender: "M" })).toBe(neutral);
  });

  test("sponsor, staff, applicant, and delivery all map to the adult role", () => {
    const female = getPersonImage({ image: null, role: "adult", gender: "F" });
    const male = getPersonImage({ image: null, role: "adult", gender: "M" });
    expect(female.startsWith("data:image/webp;base64,")).toBe(true);
    expect(male.startsWith("data:image/webp;base64,")).toBe(true);
    expect(female).not.toBe(male);
  });

  test("a managed image wins over every package fallback", () => {
    expect(getPersonImage({ image: managedChildImage, role: "child", gender: "F" })).toBe(
      managedChildImage,
    );
    expect(getPersonImage({ image: managedAdultImage, role: "adult", gender: "M" })).toBe(
      managedAdultImage,
    );
    expect(getPersonImage({ image: managedAdultImage, role: "family" })).toBe(
      managedAdultImage,
    );
  });

  test("noavatar.png reaches the package fallback", () => {
    const fallback = getPersonImage({ image: null, role: "family" });
    expect(getPersonImage({ image: "noavatar.png", role: "family" })).toBe(fallback);
    expect(getPersonImage({ image: "/noavatar.png?v=1", role: "family" })).toBe(fallback);
    expect(getPersonImage({ image: "noavatar.png", role: "child", gender: "F" })).toBe(
      getPersonImage({ image: null, role: "child", gender: "F" }),
    );
  });

  test("parent relationship-to-gender mapping (Family Dashboard feature boundary)", () => {
    const cases: Array<[string | null, "F" | "M" | null]> = [
      ["mother", "F"],
      ["Mother", "F"],
      ["mom", "F"],
      ["mère", "F"],
      ["Mère", "F"],
      ["madre", "F"],
      ["أم", "F"],
      ["father", "M"],
      ["Dad", "M"],
      ["père", "M"],
      ["padre", "M"],
      ["أب", "M"],
      ["guardian", null],
      ["", null],
      [null, null],
    ];
    for (const [relationship, expected] of cases) {
      expect(parentGenderFromRelationship(relationship)).toBe(expected);
    }
  });
});
