import { redirect } from "next/navigation";
import { NThemeImage } from "najm-theme/react";

import { getSession } from "@/lib/session";

export default async function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <section className="fixed inset-0 z-20 overflow-y-auto bg-background  text-foreground lg:p-12">
      <div className="grid min-h-full overflow-hidden rounded-3xl bg-card text-card-foreground shadow-2xl shadow-foreground/15 lg:grid-cols-2">
        <aside className="relative xl:flex overflow-hidden hidden ">
          <NThemeImage
            slot="authHeroImage"
            alt="A family supported by the Kafil platform"
            className="object-cover object-center"
            fill
            fetchPriority="high"
            loading="eager"
          />
        </aside>

        <div className=" flex w-full h-full flex-col justify-center items-center p-2 md:px-8 2xl:px-44">
          <NThemeImage
            slot="authLogo"
            alt="Kafil platform"
            className="mb-8 w-48"
            fetchPriority="high"
            loading="eager"
          />
          {children}
        </div>
      </div>
    </section>
  );
}
