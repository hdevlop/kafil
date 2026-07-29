import { AuthLanguageSelector } from "@/app/(auth)/AuthLanguageSelector";
import { BrandingImage } from "@/features/Branding";
import { loadServerBranding } from "@/lib/serverBranding";

export default async function FirstLoginLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const branding = await loadServerBranding();
  return (
    <main className="relative grid min-h-screen place-items-center overflow-y-auto bg-background p-4 text-foreground sm:p-8">
      <div className="absolute end-4 top-4 sm:end-8 sm:top-8">
        <AuthLanguageSelector />
      </div>
      <div className="flex w-full flex-col items-center gap-6 pt-14">
        <BrandingImage
          slot="authLogo"
          alt="Kafil platform"
          className="h-auto w-44"
          height={233}
          preload
          src={branding.authLogoPath}
          width={701}
        />
        {children}
      </div>
    </main>
  );
}
