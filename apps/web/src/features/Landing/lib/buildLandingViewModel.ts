import { getPersonImage } from "najm-kit/person-images";
import type { UiTranslationKey } from "@kafil/server/locales";

import { LANDING_FAMILY_EXAMPLES } from "../config/landingContent";
import type { LandingFamilyExample } from "../types";

export interface LandingFamilyCardViewModel extends LandingFamilyExample {
  name: string;
  city: string;
  membersText: string;
  needText: string;
  imageAlt: string;
}

export interface LandingViewModelDeps {
  t: (key: UiTranslationKey, params?: Record<string, string | number | boolean | null | undefined>) => string;
  money: (minorUnits: number | null | undefined) => string;
}

// Pure builder: receives translator and formatter, calls no hooks and
// imports no client-only modules, so route metadata and source tests can
// use it without a React context.
export function buildLandingFamilyViewModels(deps: LandingViewModelDeps): LandingFamilyCardViewModel[] {
  return LANDING_FAMILY_EXAMPLES.map((example, position) => ({
    ...example,
    name: deps.t(example.nameKey),
    city: deps.t(example.cityKey),
    membersText: deps.t("landing.families.membersValue", { count: example.members }),
    needText: deps.money(example.needMinor),
    imageAlt: deps.t("landing.families.cardImageAlt", { index: position + 1 }),
  }));
}

export function getLandingFamilyFallbackImage(): string {
  return getPersonImage({ role: "family" });
}
