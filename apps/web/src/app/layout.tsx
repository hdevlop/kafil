import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import { cookies } from "next/headers";
import { NajmClientRoot } from "@/components/NajmClientRoot";
import { PwaRegistration } from "@/components/PwaRegistration";
import { auth } from "@/lib/auth";
import { AppProviders } from "@/providers/AppProviders";
import { normalizeKafilLanguage, normalizeKafilTimeZone } from "@/lib/format";
import { loadServerAppearance } from "@/lib/serverAppearance";
import type { KafilTheme } from "@/providers/ThemePreferenceProvider";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: {
    default: "Kafil",
    template: "%s | Kafil",
  },
  description: "Trusted sponsorship with privacy, accountability, and care.",
  applicationName: "Kafil",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kafil",
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
  const [session, cookieStore, appearance] = await Promise.all([
    auth.getSession().catch(() => null),
    cookies(),
    loadServerAppearance(),
  ]);
  const language = normalizeKafilLanguage(
    cookieStore.get("kafil-ui-language")?.value ??
      (session?.user as { language?: unknown } | undefined)?.language,
  );
  const theme: KafilTheme = cookieStore.get("kafil-ui-theme")?.value === "dark" ? "dark" : "light";
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
          initialAppearance={appearance}
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
