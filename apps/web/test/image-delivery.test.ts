import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sourceRoot = join(import.meta.dir, "..", "src");

describe("image delivery source gates", () => {
  test("centralizes protected direct loading in ProtectedImage", () => {
    const files = [...new Bun.Glob("**/*.tsx").scanSync({ cwd: sourceRoot })];
    const unmanaged = files.filter((file) => {
      if (file.replaceAll("\\", "/") === "shared/ProtectedImage.tsx") return false;
      return readFileSync(join(sourceRoot, file), "utf8").includes("unoptimized");
    });
    expect(unmanaged).toEqual([]);

    const wrapper = readFileSync(
      join(sourceRoot, "shared", "ProtectedImage.tsx"),
      "utf8",
    );
    expect(wrapper).toContain("PROTECTED_IMAGE_PREFIXES");
    expect(wrapper).toContain("loading = \"lazy\"");
    expect(wrapper).toContain("unoptimized={isProtectedImageSource(resolved)}");
  });

  test("uses the wrapper for protected feature images", () => {
    const consumers = [
      "features/Categories/components/CategoryCard.tsx",
      "features/Categories/components/CategoryDetails.tsx",
      "features/Families/components/FamilyCard.tsx",
      "features/Families/components/FamilyDetails.tsx",
      "features/OrderCart/components/OrderCartDialog.tsx",
      "features/Products/components/ProductCard.tsx",
      "features/Products/components/ProductDetails.tsx",
    ];
    for (const consumer of consumers) {
      const source = readFileSync(join(sourceRoot, consumer), "utf8");
      expect(source).toContain("<ProtectedImage");
      expect(source).not.toContain('from "next/image"');
    }
  });

  test("routes every feature avatar through lazy managed image delivery", () => {
    const files = [...new Bun.Glob("features/**/*.tsx").scanSync({ cwd: sourceRoot })];
    const directNajmAvatars = files.filter((file) =>
      readFileSync(join(sourceRoot, file), "utf8").includes("<NAvatar"),
    );
    expect(directNajmAvatars).toEqual([]);

    const avatar = readFileSync(
      join(sourceRoot, "shared", "ManagedAvatar.tsx"),
      "utf8",
    );
    expect(avatar).toContain("<ProtectedImage");
    expect(avatar).toContain('loading="lazy"');
    expect(avatar).toContain("sizes={IMAGE_SIZES[size]}");
  });

  test("leaves public branding eligible for the Next optimizer", () => {
    const branding = readFileSync(
      join(sourceRoot, "features", "Branding", "BrandingImage.tsx"),
      "utf8",
    );
    expect(branding).not.toContain("unoptimized");
    expect(branding).toContain("preload");
    expect(branding).not.toContain("priority");
  });

  test("uses the authoritative normalized path returned by every upload", () => {
    for (const service of [
      "services/adminAccessApi.ts",
      "services/brandingApi.ts",
      "services/categoryApi.ts",
      "services/childApi.ts",
      "services/familyApi.ts",
      "services/productApi.ts",
      "services/sponsorApi.ts",
    ]) {
      const source = readFileSync(join(sourceRoot, service), "utf8");
      expect(source).toContain("api.upload<");
      expect(source).not.toContain("return `/api${");
      if (!service.endsWith("brandingApi.ts")) {
        expect(source).toContain("return uploaded.path");
      }
    }
  });
});
