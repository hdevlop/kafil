import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import { cookies } from "next/headers";
import { NajmPwaRegistration } from "najm-next/pwa/react";
import { NajmClientRoot } from "@/components/NajmClientRoot";
import { getSession } from "@/lib/session";
import { AppProviders } from "@/providers/AppProviders";
import { loadServerAppearance, loadServerBranding } from "@/lib/serverTheme";
import { kafilPreferences } from "@/lib/preferences";
import { APP_NAME } from "@/types/branding";
import { kafilI18n } from "@kafil/server/locales";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: "Trusted sponsorship with privacy, accountability, and care.",
  applicationName: APP_NAME,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  icons: {
    apple: "/icons/kafil-apple-180.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#2f6e42",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [session, cookieStore, appearance, branding] = await Promise.all([
    getSession().catch(() => null),
    cookies(),
    loadServerAppearance(),
    loadServerBranding(),
  ]);

  const { language, theme, timeZone } = kafilPreferences.resolve(cookieStore, {
    languageFallback: (session?.user as { language?: unknown } | undefined)?.language,
  });

  return (
    <html
      dir={kafilI18n.direction(language)}
      lang={language}
      data-time-zone={timeZone}
      className={`${cairo.className} ${cairo.variable} ${theme === "dark" ? "dark " : ""}h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="h-screen w-screen">
        <AppProviders
          initialBranding={branding}
          initialDesign={appearance.designConfig}
          initialLanguage={language}
          initialSession={session}
          initialTheme={theme}
          initialTimeZone={timeZone}
        >
          {children}
          <NajmClientRoot />
          <NajmPwaRegistration />
        </AppProviders>
      </body>
    </html>
  );
}
