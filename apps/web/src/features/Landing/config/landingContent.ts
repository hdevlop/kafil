import {
  BadgeCheck,
  ClipboardCheck,
  HeartHandshake,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";
import type { UiTranslationKey } from "@kafil/server/locales";
import type { LandingFamilyExample } from "../types";

export const LANDING_ANCHORS = {
  families: "families",
  howItWorks: "how-it-works",
  transparency: "transparency",
  illustrativeOrder: "illustrative-order",
  commitment: "commitment",
  faq: "faq",
  contact: "contact",
} as const;

export const LANDING_ROUTES = {
  home: "/",
  apply: "/apply",
  login: "/login",
} as const;

export interface LandingTrustItem {
  key: string;
  icon: typeof BadgeCheck;
  titleKey: UiTranslationKey;
  textKey: UiTranslationKey;
}

export const LANDING_TRUST_ITEMS: readonly LandingTrustItem[] = [
  { key: "eligibility", icon: BadgeCheck, titleKey: "landing.trust.item1Title", textKey: "landing.trust.item1Text" },
  { key: "tracked", icon: ClipboardCheck, titleKey: "landing.trust.item2Title", textKey: "landing.trust.item2Text" },
  { key: "procurement", icon: PackageCheck, titleKey: "landing.trust.item3Title", textKey: "landing.trust.item3Text" },
  { key: "goods", icon: HeartHandshake, titleKey: "landing.trust.item4Title", textKey: "landing.trust.item4Text" },
  { key: "privacy", icon: ShieldCheck, titleKey: "landing.trust.item5Title", textKey: "landing.trust.item5Text" },
];

// Eight fictional illustrative profiles. Amounts are integer MAD minor
// units. Names, cities, and alt text resolve through the locale catalog;
// nothing here claims a registered Kafil family.
export const LANDING_FAMILY_EXAMPLES: readonly LandingFamilyExample[] = [
  { id: "example-01", nameKey: "landing.families.card1Name", cityKey: "landing.families.card1City", status: "active", members: 5, needMinor: 150000, imageSrc: "/landing/family-example-01-v2.png" },
  { id: "example-02", nameKey: "landing.families.card2Name", cityKey: "landing.families.card2City", status: "active", members: 4, needMinor: 120000, imageSrc: "/landing/family-example-02-v2.png" },
  { id: "example-03", nameKey: "landing.families.card3Name", cityKey: "landing.families.card3City", status: "active", members: 6, needMinor: 180000, imageSrc: "/landing/family-example-03-v2.png" },
  { id: "example-04", nameKey: "landing.families.card4Name", cityKey: "landing.families.card4City", status: "pending", members: 3, needMinor: 90000, imageSrc: "/landing/family-example-04-v2.png" },
  { id: "example-05", nameKey: "landing.families.card5Name", cityKey: "landing.families.card5City", status: "pending", members: 5, needMinor: 140000, imageSrc: "/landing/family-example-05-v2.png" },
  { id: "example-06", nameKey: "landing.families.card6Name", cityKey: "landing.families.card6City", status: "active", members: 4, needMinor: 110000, imageSrc: "/landing/family-example-06-v2.png" },
  { id: "example-07", nameKey: "landing.families.card7Name", cityKey: "landing.families.card7City", status: "pending", members: 7, needMinor: 200000, imageSrc: "/landing/family-example-07-v2.png" },
  { id: "example-08", nameKey: "landing.families.card8Name", cityKey: "landing.families.card8City", status: "active", members: 4, needMinor: 100000, imageSrc: "/landing/family-example-08-v2.png" },
];
