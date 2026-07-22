import { describe, expect, test } from "bun:test";

import {
  getChildPersonImage,
  getFamilyAvatarImage,
  getParentPersonImage,
} from "../src/lib/personImages";

describe("person image fallbacks", () => {
  test("uses gender and relationship illustrations", () => {
    expect(getChildPersonImage("F")).toBe("/images/people/child-female.png");
    expect(getChildPersonImage("M")).toBe("/images/people/child-male.png");
    expect(getParentPersonImage("Mother")).toBe(
      "/images/people/parent-female.png",
    );
    expect(getParentPersonImage("Father")).toBe(
      "/images/people/parent-male.png",
    );
  });

  test("replaces Najm no-avatar sentinels but preserves real images", () => {
    expect(getFamilyAvatarImage("noavatar.png", "Father")).toBe(
      "/images/people/parent-male.png",
    );
    expect(getFamilyAvatarImage("/noavatar.png?v=1", "Mother")).toBe(
      "/images/people/parent-female.png",
    );
    expect(getFamilyAvatarImage("https://example.com/photo.png", "Father")).toBe(
      "https://example.com/photo.png",
    );
  });
});
