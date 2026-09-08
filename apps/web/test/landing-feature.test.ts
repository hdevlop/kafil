import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

import { ar, en, es, fr } from "@kafil/server/locales";
import {
  LANDING_ANCHORS,
  LANDING_FAMILY_EXAMPLES,
  LANDING_ROUTES,
} from "../src/features/Landing/config/landingContent";
import {
  HERO_NEUTRAL_FALLBACK,
  heroSlidesByLanguage,
} from "../src/features/Landing/config/landingHeroSlides";
import {
  LANDING_CTA_MASCOT_SRC,
  landingMascots,
} from "../src/features/Landing/config/landingMascots";
import { buildLandingFamilyViewModels } from "../src/features/Landing/lib/buildLandingViewModel";

const webRoot = join(import.meta.dir, "..");
const landingRoot = join(webRoot, "src/features/Landing");
const publicRoot = join(webRoot, "public");
function readSource(relativePath: string) {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

function landingSources(): string[] {
  const files: string[] = [];
  const walk = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const full = join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
    }
  };
  walk(landingRoot);
  return files;
}

function getPath(dictionary: unknown, dotted: string): unknown {
  return dotted.split(".").reduce<unknown>(
    (current, part) =>
      current !== null && typeof current === "object"
        ? (current as Record<string, unknown>)[part]
        : undefined,
    dictionary,
  );
}

// Every user-visible landing string, as stored in the raw dictionaries.
const REQUIRED_LANDING_KEYS = [
  "ui.landing.skip",
  "ui.landing.header.home",
  "ui.landing.header.families",
  "ui.landing.header.howItWorks",
  "ui.landing.header.contact",
  "ui.landing.header.signIn",
  "ui.landing.header.navLabel",
  "ui.landing.header.openMenu",
  "ui.landing.header.closeMenu",
  "ui.landing.hero.eyebrow",
  "ui.landing.hero.title",
  "ui.landing.hero.description",
  "ui.landing.hero.sponsorCta",
  "ui.landing.hero.examplesCta",
  "ui.landing.hero.carouselLabel",
  "ui.landing.hero.previous",
  "ui.landing.hero.next",
  "ui.landing.hero.pause",
  "ui.landing.hero.play",
  "ui.landing.hero.position",
  "ui.landing.hero.slide1Alt",
  "ui.landing.hero.slide2Alt",
  "ui.landing.trust.title",
  "ui.landing.trust.item1Title",
  "ui.landing.trust.item1Text",
  "ui.landing.trust.item2Title",
  "ui.landing.trust.item2Text",
  "ui.landing.trust.item3Title",
  "ui.landing.trust.item3Text",
  "ui.landing.trust.item4Title",
  "ui.landing.trust.item4Text",
  "ui.landing.trust.item5Title",
  "ui.landing.trust.item5Text",
  "ui.landing.how.title",
  "ui.landing.how.subtitle",
  "ui.landing.how.step1Title",
  "ui.landing.how.step1Text",
  "ui.landing.how.step2Title",
  "ui.landing.how.step2Text",
  "ui.landing.how.step3Title",
  "ui.landing.how.step3Text",
  "ui.landing.how.step4Title",
  "ui.landing.how.step4Text",
  "ui.landing.families.title",
  "ui.landing.families.subtitle",
  "ui.landing.families.disclosureTitle",
  "ui.landing.families.disclosureText",
  "ui.landing.families.exampleBadge",
  "ui.landing.families.membersLabel",
  "ui.landing.families.membersValue",
  "ui.landing.families.needLabel",
  "ui.landing.families.applyCta",
  "ui.landing.families.cardImageAlt",
  "ui.landing.families.card1Name",
  "ui.landing.families.card1City",
  "ui.landing.families.card2Name",
  "ui.landing.families.card2City",
  "ui.landing.families.card3Name",
  "ui.landing.families.card3City",
  "ui.landing.families.card4Name",
  "ui.landing.families.card4City",
  "ui.landing.families.card5Name",
  "ui.landing.families.card5City",
  "ui.landing.families.card6Name",
  "ui.landing.families.card6City",
  "ui.landing.families.card7Name",
  "ui.landing.families.card7City",
  "ui.landing.families.card8Name",
  "ui.landing.families.card8City",
  "ui.landing.cta.title",
  "ui.landing.cta.text",
  "ui.landing.cta.sponsorCta",
  "ui.landing.cta.familiesCta",
  "ui.landing.footer.tagline",
  "ui.landing.footer.navTitle",
  "ui.landing.footer.contactTitle",
  "ui.landing.footer.contactText",
  "ui.landing.footer.applyCta",
  "ui.landing.footer.loginCta",
  "ui.landing.footer.rights",
];

// Values legitimately identical to English: invariant Moroccan city proper
// nouns and the French cognate "Contact" (mirrors locale-parity allowlist).
const SHARED_WITH_ENGLISH = new Set([
  "fr:ui.landing.header.contact",
  "fr:ui.landing.footer.contactTitle",
  "fr:ui.landing.families.card1City",
  "fr:ui.landing.families.card2City",
  "fr:ui.landing.families.card3City",
  "fr:ui.landing.families.card5City",
  "fr:ui.landing.families.card8City",
  "es:ui.landing.families.card1City",
  "es:ui.landing.families.card2City",
  "es:ui.landing.families.card3City",
  "es:ui.landing.families.card5City",
  "es:ui.landing.families.card8City",
]);

describe("landing feature contract", () => {
  test("the route delegates to LandingPage and the layout owns one header and one footer", () => {
    const page = readSource("src/app/(landing)/page.tsx");
    expect(page).toContain("<LandingPage");
    expect(page).toContain("generateMetadata");

    // The najm-kit root entry is client-only (react-hook-form), so the
    // composing LandingPage must stay a Client Component: a server import
    // breaks the production Turbopack build. Metadata stays in page.tsx.
    expect(readSource("src/features/Landing/components/LandingPage.tsx")).toStartWith('"use client";');

    const layout = readSource("src/app/(landing)/layout.tsx");
    expect(layout.match(/<LandingHeader/g)?.length).toBe(1);
    expect(layout.match(/<LandingFooter/g)?.length).toBe(1);
    expect(layout).not.toContain("<header");
    expect(layout).not.toContain("<footer");
  });

  test("all Phase A destinations are allowed routes or declared in-page anchors", () => {
    expect(Object.values(LANDING_ROUTES).sort()).toEqual(["/", "/apply", "/login"]);
    expect(LANDING_ANCHORS).toEqual({
      families: "families",
      howItWorks: "how-it-works",
      contact: "contact",
    });

    const allowedAnchors = new Set(["families", "how-it-works", "contact", "landing-main"]);
    for (const source of landingSources().map((file) => readFileSync(file, "utf8"))) {
      for (const match of source.matchAll(/href=\{"#([A-Za-z-]+)"\}/g)) {
        expect(allowedAnchors.has(match[1]), `unexpected in-page link #${match[1]}`).toBe(true);
      }
      // Templated in-page links must resolve through the declared anchor
      // manifest, never through an inline literal.
      for (const match of source.matchAll(/`#\$\{([^}]+)\}/g)) {
        expect(match[1].startsWith("LANDING_ANCHORS."), `unexpected templated link ${match[0]}`).toBe(true);
        const anchor = (LANDING_ANCHORS as Record<string, string>)[match[1].replace("LANDING_ANCHORS.", "")];
        expect(allowedAnchors.has(anchor), `templated link resolves outside the allowlist`).toBe(true);
      }
      for (const match of source.matchAll(/href="\/#?([A-Za-z-]*)"/g)) {
        expect(["", "apply", "login"].includes(match[1]), `unexpected route link ${match[0]}`).toBe(true);
      }
    }

    const header = readSource("src/features/Landing/components/LandingHeader.tsx");
    expect(header).toContain('href="#landing-main"');
  });

  test("landing metadata follows the active locale instead of hard-coded English", () => {
    const page = readSource("src/app/(landing)/page.tsx");
    // Resolves the same language cookie the root layout uses for <html lang>.
    expect(page).toContain("kafilPreferences.resolve");
    expect(page).toContain("kafilUiI18n.createTranslator");
    expect(page).toContain('t("landing.meta.title")');
    expect(page).toContain('t("landing.meta.description")');
    expect(page).toContain("kafilLocales[language]");
    expect(page).toContain("openGraph");
    expect(page).toContain("twitter");
    expect(page).toContain('canonical: "/"');
    // No hard-coded English title/description in the route file.
    expect(page).not.toContain("Transparent giving");
    expect(page).not.toContain("connects reviewed family needs");
  });

  test("header preferences are localized and use logical RTL properties", () => {
    const header = readSource("src/features/Landing/components/LandingHeader.tsx");
    expect(header).toContain('t("landing.header.themeToggle")');
    expect(header).toContain('t("landing.header.languageError")');
    expect(header).toContain('t("language.label")');
    // Logical inline-end margin mirrors in Arabic RTL; physical mr-* does not.
    expect(header).toContain("me-2");
    expect(header).not.toMatch(/mr-2/);
    // No hard-coded English accessible names for theme/language controls.
    expect(header).not.toContain('aria-label="Toggle');
    expect(header).not.toContain('aria-label="Language"');
    expect(header).not.toContain("Could not update language");
  });

  test("the static hero has no redundant controls and the skip target is focusable", () => {
    const heroImage = readSource("src/features/Landing/components/LandingHeroImage.tsx");
    expect(heroImage).toContain("NNextImage");
    expect(heroImage).not.toContain("NButton");
    expect(heroImage).not.toContain("setInterval");
    const landingPage = readSource("src/features/Landing/components/LandingPage.tsx");
    expect(landingPage).toContain('id="landing-main"');
    expect(landingPage).toContain("tabIndex={-1}");
    expect(landingPage).not.toContain("LandingHowItWorks");
    expect(readSource("src/features/Landing/components/LandingTrustStrip.tsx")).toContain(
      "LANDING_ANCHORS.howItWorks",
    );
  });

  test("absent routes, newsletter, and placeholder links are never emitted", () => {
    const sources = landingSources().map((file) => readFileSync(file, "utf8")).join("\n");
    expect(sources).not.toContain('"/families"');
    expect(sources).not.toContain('"/catalog"');
    expect(sources).not.toContain('"/contact"');
    expect(sources).not.toContain('href="#"');
    expect(sources).not.toMatch(/href=\{"#"\}/);
    expect(sources.toLowerCase()).not.toContain("newsletter");
  });

  test("family example cards reuse the family status treatment", () => {
    const card = readSource("src/features/Landing/components/LandingFamilyExampleCard.tsx");
    expect(card).toContain("FamilyCardFrame");
    expect(card).toContain("bordered");
    expect(card).toContain("status={model.status}");
    expect(card).toContain('model.status === "active"');
    expect(card).toContain("BadgeCheck");
    expect(card).not.toContain("exampleBadge");
    expect(card).not.toMatch(/[Vv]erified/);

    expect(LANDING_FAMILY_EXAMPLES.some((example) => example.status === "active")).toBe(true);
    expect(LANDING_FAMILY_EXAMPLES.some((example) => example.status === "pending")).toBe(true);

    for (const key of REQUIRED_LANDING_KEYS.filter((item) => item.startsWith("ui.landing.families."))) {
      for (const dictionary of [en, fr, ar, es]) {
        expect(String(getPath(dictionary, key))).not.toMatch(/[Vv]erifi|موثق/);
      }
    }
  });

  test("no invented operational totals or percentages are rendered", () => {
    for (const key of REQUIRED_LANDING_KEYS) {
      for (const dictionary of [en, fr, ar, es]) {
        const value = String(getPath(dictionary, key));
        expect(value).not.toContain("%");
        expect(value).not.toMatch(
          /\b\d[\d\s.,]*\s?(families|orders|partners|beneficiaries|sponsors|familles|commandes|partenaires|أسر|طلبات)\b/i,
        );
      }
    }
    const sources = landingSources().map((file) => readFileSync(file, "utf8")).join("\n");
    expect(sources).not.toMatch(/\d+\s*%/);
  });

  test("every required raw locale key exists and is translated", () => {
    const english = en as unknown;
    for (const key of REQUIRED_LANDING_KEYS) {
      const reference = getPath(english, key);
      expect(typeof reference, `en is missing ${key}`).toBe("string");
      expect((reference as string).length > 0).toBe(true);
      for (const [language, dictionary] of Object.entries({ fr, ar, es })) {
        const value = getPath(dictionary, key);
        expect(typeof value, `${language} is missing ${key}`).toBe("string");
        if (SHARED_WITH_ENGLISH.has(`${language}:${key}`)) continue;
        expect(value, `${language}.${key} copies English`).not.toBe(reference);
      }
    }
  });

  test("branding uses theme slots and actions use Kit controls", () => {
    const header = readSource("src/features/Landing/components/LandingHeader.tsx");
    const footer = readSource("src/features/Landing/components/LandingFooter.tsx");
    for (const source of [header, footer]) {
      expect(source).toContain('slot="sidebarLogoExpanded"');
      expect(source).toContain("NThemeImage");
      expect(source).not.toContain("BrandingImage");
      expect(source).not.toContain("FACTORY_");
    }
    const hero = readSource("src/features/Landing/components/LandingHero.tsx");
    expect(hero).toContain("NButton asChild");
    expect(hero).not.toContain("emerald-");
    expect(hero).not.toContain("stone-");
    for (const file of landingSources()) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toContain("emerald-");
      expect(source).not.toContain("stone-");
    }
  });

  test("images use NNextImage with sizing and fallback, never raw img", () => {
    for (const relativePath of [
      "src/features/Landing/components/LandingHeroImage.tsx",
      "src/features/Landing/components/LandingCtaBanner.tsx",
    ]) {
      const source = readSource(relativePath);
      expect(source).toContain("NNextImage");
      expect(source).toContain("fallbackSrc");
      expect(source).not.toContain("<img");
      expect(source).not.toContain('from "next/image"');
    }
    const familyCard = readSource("src/features/Landing/components/LandingFamilyExampleCard.tsx");
    expect(familyCard).toContain("FamilyCardFrame");
    expect(familyCard).toContain("imageFallbackSrc");
    expect(familyCard).not.toContain("<img");
  });

  test("only the static hero image is eligible for priority loading", () => {
    const heroImage = readSource("src/features/Landing/components/LandingHeroImage.tsx");
    expect(heroImage).toContain("priority");
    expect(readSource("src/features/Landing/components/LandingCtaBanner.tsx")).not.toContain("priority");
    expect(readSource("src/features/Landing/components/LandingFamilyExampleCard.tsx")).not.toContain("priority");
  });

  test("no runtime path discovery is used for hero or mascot assets", () => {
    for (const relativePath of [
      "src/features/Landing/config/landingHeroSlides.ts",
      "src/features/Landing/config/landingMascots.ts",
    ]) {
      const source = readSource(relativePath);
      expect(source).not.toContain("readdir");
      expect(source).not.toContain("glob");
      expect(source).not.toContain("node:fs");
      expect(source).not.toContain("readFileSync");
    }
  });

  test("the hero manifest uses one valid 4:3 image per locale", async () => {
    for (const locale of ["en", "fr", "ar", "es"] as const) {
      const slides = heroSlidesByLanguage[locale];
      expect(slides).toHaveLength(1);
      for (const slide of slides) {
        expect(slide.width).toBe(1448);
        expect(slide.height).toBe(1086);
        const filePath = join(publicRoot, slide.src.replace(/^\//, ""));
        const metadata = await sharp(filePath).metadata();
        expect(metadata.width).toBe(slide.width);
        expect(metadata.height).toBe(slide.height);
        expect(existsSync(join(publicRoot, slide.fallbackSrc.replace(/^\//, "")))).toBe(true);
      }
    }
    const neutral = await sharp(join(publicRoot, HERO_NEUTRAL_FALLBACK.replace(/^\//, ""))).metadata();
    expect(neutral.width).toBe(1448);
    expect(neutral.height).toBe(1086);
  });

  test("the mascot manifest fixes the decorative CTA artwork with declared dimensions", async () => {
    expect(LANDING_CTA_MASCOT_SRC).toBe("/mascots/mascot-heart-gift.png");
    for (const mascot of Object.values(landingMascots)) {
      expect(mascot.width).toBe(1122);
      expect(mascot.height).toBe(1402);
      const metadata = await sharp(join(publicRoot, mascot.src.replace(/^\//, ""))).metadata();
      expect(metadata.width).toBe(1122);
      expect(metadata.height).toBe(1402);
    }
    const banner = readSource("src/features/Landing/components/LandingCtaBanner.tsx");
    expect(banner.match(/<NNextImage/g)?.length).toBe(1);
    expect(banner).toContain('alt=""');
    expect(banner).toContain("LANDING_CTA_MASCOT_SRC");
    expect(banner).not.toContain("HandsIcon");
  });

  test("family view models keep integer minor units and translated copy", async () => {
    const seen: string[] = [];
    const models = buildLandingFamilyViewModels({
      t: ((key: string, params?: Record<string, string | number>) => {
        seen.push(key);
        if (params?.count !== undefined) return `${params.count} members`;
        if (params?.index !== undefined) return `Artwork ${params.index}`;
        return `t:${key}`;
      }) as never,
      money: (minor) => `formatted:${minor}`,
    });
    expect(models).toHaveLength(8);
    expect(LANDING_FAMILY_EXAMPLES).toHaveLength(8);
    for (const model of models) {
      expect(Number.isInteger(model.needMinor)).toBe(true);
      expect(model.needText).toBe(`formatted:${model.needMinor}`);
      expect(model.imageAlt).toContain("Artwork");
      const imagePath = join(publicRoot, model.imageSrc.replace(/^\//, ""));
      expect(existsSync(imagePath)).toBe(true);
      const metadata = await sharp(imagePath).metadata();
      expect(metadata.width).toBe(1448);
      expect(metadata.height).toBe(1086);
    }
    expect(seen).toContain("landing.families.membersValue");
  });
});
