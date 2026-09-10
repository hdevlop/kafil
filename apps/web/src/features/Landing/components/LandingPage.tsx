"use client";

import { NPageLayout } from "najm-kit";

import { DignitySection } from "./DignitySection";
import { FaqSection } from "./FaqSection";
import { HowItWorksSection } from "./HowItWorksSection";
import { LandingCtaBanner } from "./LandingCtaBanner";
import { LandingFamilyExamples } from "./LandingFamilyExamples";
import { LandingHero } from "./LandingHero";
import { LandingTrustStrip } from "./LandingTrustStrip";
import { TransparencySection } from "./TransparencySection";

// Main sections only. The route layout owns LandingHeader and
// LandingFooter so chrome is never duplicated.
export function LandingPage() {
  // tabIndex -1 makes the skip-link target programmatically focusable, so
  // keyboard focus (not just the URL hash) reaches the main content.
  return (
    <NPageLayout as="main" id="landing-main" tabIndex={-1}>
      <LandingHero />
      <LandingTrustStrip />
      <LandingFamilyExamples />
      <HowItWorksSection />
      <TransparencySection />
      <DignitySection />
      <FaqSection />
      <LandingCtaBanner />
    </NPageLayout>
  );
}
