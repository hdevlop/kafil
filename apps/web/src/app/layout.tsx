import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import { NajmPwaRegistration } from "najm-next/pwa/react";
import { NajmClientRoot } from "@/components/NajmClientRoot";
import { loadUiSnapshot } from "@/najm.server";
import { AppProviders } from "@/providers/AppProviders";
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

export default async function RootLayout({children,}: Readonly<{children: React.ReactNode;}>) {

  const snapshot = await loadUiSnapshot();
  const { language, theme, timeZone } = snapshot.preferences;

  return (
    <html
      dir={kafilI18n.direction(language)}
      lang={language}
      data-time-zone={timeZone}
      className={`${cairo.className} ${cairo.variable} ${theme === "dark" ? "dark " : ""}h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="h-screen w-screen">
        <AppProviders snapshot={snapshot}>
          {children}
          <NajmClientRoot />
          <NajmPwaRegistration />
        </AppProviders>
      </body>
    </html>
  );
}
