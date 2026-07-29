import { describe, expect, test } from "bun:test";

import {
  getChildAvatarImage,
  getChildPersonImage,
  getFamilyAvatarImage,
  getFamilyPersonImage,
  getSponsorAvatarImage,
} from "../src/lib/personImages";

describe("person image fallbacks", () => {
  test("uses gender illustrations for children", () => {
    expect(getChildPersonImage("F")).toBe("/images/people/child-female.webp");
    expect(getChildPersonImage("M")).toBe("/images/people/child-male.webp");
  });

  test("uses the neutral family illustration as a household fallback", () => {
    expect(getFamilyPersonImage()).toBe("/images/people/family.webp");
  });

  test("replaces Najm no-avatar sentinels but preserves real images", () => {
    expect(getFamilyAvatarImage("noavatar.png")).toBe(
      "/images/people/family.webp",
    );
    expect(getFamilyAvatarImage("/noavatar.png?v=1")).toBe(
      "/images/people/family.webp",
    );
    expect(getFamilyAvatarImage("https://example.com/photo.png")).toBe(
      "https://example.com/photo.png",
    );
  });

  test("prefers persisted child images and falls back to gender", () => {
    expect(
      getChildAvatarImage(
        "/api/child-images/files/serve/00000000-0000-4000-8000-000000000050.png",
        "F",
      ),
    ).toBe(
      "/api/child-images/files/serve/00000000-0000-4000-8000-000000000050.png",
    );
    expect(getChildAvatarImage("noavatar.png", "F")).toBe(
      "/images/people/child-female.webp",
    );
    expect(getChildAvatarImage("/noavatar.png?v=1", "M")).toBe(
      "/images/people/child-male.webp",
    );
    expect(getChildAvatarImage(null, "F")).toBe(
      "/images/people/child-female.webp",
    );
    expect(getChildAvatarImage(undefined, "M")).toBe(
      "/images/people/child-male.webp",
    );
  });

  test("uses gender-matched sponsor fallbacks", () => {
    expect(getSponsorAvatarImage(null, "F")).toBe(
      "/images/people/sponsor_female.webp",
    );
    expect(getSponsorAvatarImage(null, "M")).toBe(
      "/images/people/sponsor_male.webp",
    );
    expect(getSponsorAvatarImage("noavatar.png", "F")).toBe(
      "/images/people/sponsor_female.webp",
    );
    expect(
      getSponsorAvatarImage("https://example.com/sponsor.png", "F"),
    ).toBe("https://example.com/sponsor.png");
  });
});
