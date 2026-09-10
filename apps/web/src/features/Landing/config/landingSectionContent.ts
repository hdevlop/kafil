import {
  Check,
  Heart,
  LockKeyhole,
  Package,
  ShieldCheck,
  ShoppingCart,
  Truck,
  UsersRound,
} from "lucide-react";

import type {
  LandingFaqItem,
  LandingOrderStatus,
  LandingProcessStep,
  LandingSampleProduct,
  LandingSectionItem,
} from "../types";

export const LANDING_PROCESS_STEPS: readonly LandingProcessStep[] = [
  {
    id: "choose-family",
    number: 1,
    icon: UsersRound,
    titleKey: "landing.process.step1Title",
    textKey: "landing.process.step1Text",
  },
  {
    id: "fund-essentials",
    number: 2,
    icon: Package,
    titleKey: "landing.process.step2Title",
    textKey: "landing.process.step2Text",
  },
  {
    id: "procurement",
    number: 3,
    icon: ShoppingCart,
    titleKey: "landing.process.step3Title",
    textKey: "landing.process.step3Text",
  },
  {
    id: "delivery",
    number: 4,
    icon: Truck,
    titleKey: "landing.process.step4Title",
    textKey: "landing.process.step4Text",
  },
] as const;

export const LANDING_TRANSPARENCY_BENEFITS: readonly LandingSectionItem[] = [
  {
    id: "itemized-purchases",
    icon: Check,
    titleKey: "landing.transparency.benefit1Title",
    textKey: "landing.transparency.benefit1Text",
  },
  {
    id: "clear-updates",
    icon: Check,
    titleKey: "landing.transparency.benefit2Title",
    textKey: "landing.transparency.benefit2Text",
  },
  {
    id: "delivery-confirmation",
    icon: Check,
    titleKey: "landing.transparency.benefit3Title",
    textKey: "landing.transparency.benefit3Text",
  },
] as const;

export const LANDING_SAMPLE_PRODUCTS: readonly LandingSampleProduct[] = [
  {
    id: "school-bag",
    nameKey: "landing.sampleOrder.schoolBag",
    assetKey: "schoolBag",
    amountMinor: 25_000,
  },
  {
    id: "notebooks",
    nameKey: "landing.sampleOrder.notebooks",
    assetKey: "notebooks",
    amountMinor: 12_000,
  },
  {
    id: "stationery",
    nameKey: "landing.sampleOrder.stationery",
    assetKey: "stationery",
    amountMinor: 8_000,
  },
] as const;

export const LANDING_SAMPLE_ORDER_TOTAL_MINOR = LANDING_SAMPLE_PRODUCTS.reduce(
  (total, product) => total + product.amountMinor,
  0,
);

export const LANDING_SAMPLE_ORDER_STATUSES: readonly LandingOrderStatus[] = [
  {
    id: "approved",
    icon: Check,
    labelKey: "landing.sampleOrder.approved",
  },
  {
    id: "purchased",
    icon: Check,
    labelKey: "landing.sampleOrder.purchased",
  },
  {
    id: "delivered",
    icon: Check,
    labelKey: "landing.sampleOrder.delivered",
  },
] as const;

export const LANDING_DIGNITY_BENEFITS: readonly LandingSectionItem[] = [
  {
    id: "verified-needs",
    icon: ShieldCheck,
    titleKey: "landing.dignity.benefit1Title",
    textKey: "landing.dignity.benefit1Text",
  },
  {
    id: "privacy",
    icon: LockKeyhole,
    titleKey: "landing.dignity.benefit2Title",
    textKey: "landing.dignity.benefit2Text",
  },
  {
    id: "goods-support",
    icon: Heart,
    titleKey: "landing.dignity.benefit3Title",
    textKey: "landing.dignity.benefit3Text",
  },
] as const;

export const LANDING_FAQ_ITEMS: readonly LandingFaqItem[] = [
  {
    id: "cash",
    questionKey: "landing.faq.item1Question",
    answerKey: "landing.faq.item1Answer",
  },
  {
    id: "multiple-families",
    questionKey: "landing.faq.item2Question",
    answerKey: "landing.faq.item2Answer",
  },
  {
    id: "follow-contribution",
    questionKey: "landing.faq.item3Question",
    answerKey: "landing.faq.item3Answer",
  },
  {
    id: "family-review",
    questionKey: "landing.faq.item4Question",
    answerKey: "landing.faq.item4Answer",
  },
] as const;
