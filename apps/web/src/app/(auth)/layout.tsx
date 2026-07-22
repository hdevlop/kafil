import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";


export default async function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {

  const session = await auth.getSession();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <section className="fixed inset-0 z-20 overflow-y-auto bg-background p-2 text-foreground lg:p-12">
      <div className="grid min-h-full overflow-hidden rounded-3xl bg-card text-card-foreground shadow-2xl shadow-foreground/15 lg:grid-cols-2">
        <aside className="relative xl:flex overflow-hidden hidden ">
          <Image
            alt="A family supported by the Kafil platform"
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            src="/HeroA.png"
          />
        </aside>

        <div className=" flex w-full h-full flex-col justify-center items-center p-2 md:px-8 2xl:px-44">
          <Image
            alt="Kafil platform"
            className="mb-8 w-48"
            height={233}
            priority
            src="/logoExpanded.png"
            width={701}
          />
          {children}
        </div>
      </div>
    </section>
  );
}
