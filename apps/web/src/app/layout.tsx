import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import { cookies } from "next/headers";
import { NajmClientRoot } from "@/components/NajmClientRoot";
import { PwaRegistration } from "@/components/PwaRegistration";
import { auth } from "@/lib/auth";
import { AppProviders } from "@/providers/AppProviders";
import { normalizeKafilLanguage } from "@/lib/format";
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
  const session = await auth.getSession().catch(() => null);
  const cookieStore = await cookies();
  const language = normalizeKafilLanguage(
    cookieStore.get("kafil-ui-language")?.value ??
      (session?.user as { language?: unknown } | undefined)?.language,
  );
  const theme: KafilTheme = cookieStore.get("kafil-ui-theme")?.value === "dark" ? "dark" : "light";

  return (
    <html
      dir={language === "ar" ? "rtl" : "ltr"}
      lang={language}
      className={`${cairo.className} ${cairo.variable} ${theme === "dark" ? "dark " : ""}h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="h-screen w-screen">
        <AppProviders initialLanguage={language} initialSession={session} initialTheme={theme}>
          {children}
          <NajmClientRoot />
          <PwaRegistration />
        </AppProviders>
      </body>
    </html>
  );
}
