import type { LandingMascot } from "../types";

export const MASCOT_WIDTH = 1122;
export const MASCOT_HEIGHT = 1402;

function mascot(src: string): LandingMascot {
  return { src, width: MASCOT_WIDTH, height: MASCOT_HEIGHT };
}

// Explicit mascot-to-placement manifest. Paths are never built from
// translated text or unchecked input. The CTA entry is fixed.
export const landingMascots = {
  cta: mascot("/mascots/mascot-heart-gift.png"),
  goods: mascot("/mascots/mascot-grocery-basket.png"),
  idea: mascot("/mascots/mascot-idea.png"),
  thumbsUp: mascot("/mascots/mascot-thumbs-up.png"),
  waving: mascot("/mascots/mascot-waving.png"),
} as const;

export const LANDING_CTA_MASCOT_SRC = landingMascots.cta.src;
