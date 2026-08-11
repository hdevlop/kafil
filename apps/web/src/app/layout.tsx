import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import { cookies } from "next/headers";
import { NajmClientRoot } from "@/components/NajmClientRoot";
import { PwaRegistration } from "@/components/PwaRegistration";
import { getSession } from "@/lib/session";
import { AppProviders } from "@/providers/AppProviders";
import { loadServerAppearance, loadServerBranding } from "@/lib/serverTheme";
import {
  isKafilTheme,
  normalizeKafilLanguage,
  normalizeKafilTimeZone,
  type KafilTheme,
} from "@/preferences";
import { APP_NAME } from "@/types/branding";
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

  const language = normalizeKafilLanguage(
    cookieStore.get("kafil-ui-language")?.value ??
      (session?.user as { language?: unknown } | undefined)?.language,
  );

  const themeCookie = cookieStore.get("kafil-ui-theme")?.value;
  const theme: KafilTheme = isKafilTheme(themeCookie) ? themeCookie : "light";
  const timeZone = normalizeKafilTimeZone(cookieStore.get("kafil-ui-timezone")?.value);

  return (
    <html
      dir={language === "ar" ? "rtl" : "ltr"}
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
          <PwaRegistration />
        </AppProviders>
      </body>
    </html>
  );
}
