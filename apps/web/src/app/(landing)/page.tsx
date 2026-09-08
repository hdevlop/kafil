import type { Metadata } from "next";
import { cookies } from "next/headers";

import { kafilPreferences } from "@/lib/preferences";
import { kafilLocales, kafilUiI18n } from "@kafil/server/locales";
import { LandingPage } from "@/features/Landing";

// Localized per request from the same language cookie the root layout uses
// for <html lang>, so crawlers and previews see the active locale's copy.
export async function generateMetadata(): Promise<Metadata> {
  const { language } = kafilPreferences.resolve(await cookies());
  const t = kafilUiI18n.createTranslator(language);
  const title = t("landing.meta.title");
  const description = t("landing.meta.description");
  return {
    title,
    description,
    alternates: { canonical: "/" },
    openGraph: {
      title,
      description,
      url: "/",
      type: "website",
      locale: kafilLocales[language],
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default function LandingRoutePage() {
  return <LandingPage />;
}
