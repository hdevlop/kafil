import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { BrandingImage } from "@/features/Branding";
import { loadServerBranding } from "@/lib/serverBranding";

export default async function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [session, branding] = await Promise.all([
    auth.getSession(),
    loadServerBranding(),
  ]);

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <section className="fixed inset-0 z-20 overflow-y-auto bg-background p-2 text-foreground lg:p-12">
      <div className="grid min-h-full overflow-hidden rounded-3xl bg-card text-card-foreground shadow-2xl shadow-foreground/15 lg:grid-cols-2">
        <aside className="relative xl:flex overflow-hidden hidden ">
          <BrandingImage
            slot="authHeroImage"
            alt="A family supported by the Kafil platform"
            className="object-cover object-center"
            fill
            preload
            sizes="(min-width: 1024px) 50vw, 100vw"
            src={branding.authHeroImagePath}
          />
        </aside>

        <div className=" flex w-full h-full flex-col justify-center items-center p-2 md:px-8 2xl:px-44">
          <BrandingImage
            slot="authLogo"
            alt="Kafil platform"
            className="mb-8 w-48"
            height={233}
            preload
            src={branding.authLogoPath}
            width={701}
          />
          {children}
        </div>
      </div>
    </section>
  );
}
