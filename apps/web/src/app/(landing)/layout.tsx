import Link from "next/link";

export default function LandingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-950">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link className="text-xl font-semibold tracking-tight" href="/">
            Kafil
          </Link>
          <Link
            className="rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-800"
            href="/login"
          >
            Sign in
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
