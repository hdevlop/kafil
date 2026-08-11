import { NThemeImage } from "najm-theme/react";

import { AuthLanguageSelector } from "@/app/(auth)/AuthLanguageSelector";

export default function FirstLoginLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-y-auto bg-background p-4 text-foreground sm:p-8">
      <div className="absolute end-4 top-4 sm:end-8 sm:top-8">
        <AuthLanguageSelector />
      </div>
      <div className="flex w-full flex-col items-center gap-6">
        <NThemeImage
          slot="authLogo"
          alt="Kafil platform"
          className="h-auto w-44"
          fetchPriority="high"
          loading="eager"
        />
        {children}
      </div>
    </main>
  );
}
