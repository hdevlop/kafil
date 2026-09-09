import type { Metadata } from "next";
import { cookies, headers } from "next/headers";

import { kafilPreferences } from "@/lib/preferences";
import { getSession } from "@/lib/session";
import { kafilLocales, kafilUiI18n } from "@kafil/server/locales";
import { LandingPage } from "@/features/Landing";

// Localized per request from the same cookie, account preference, and browser
// language the root layout uses for <html lang>, so metadata and copy agree.
export async function generateMetadata(): Promise<Metadata> {
  const [cookieStore, requestHeaders, session] = await Promise.all([
    cookies(),
    headers(),
    getSession().catch(() => null),
  ]);
  const { language } = kafilPreferences.resolve(cookieStore, {
    languageFallback: (session?.user as { language?: unknown } | undefined)?.language,
    acceptLanguage: requestHeaders.get("accept-language"),
  });
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
