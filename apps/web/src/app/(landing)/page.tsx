import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto grid min-h-[calc(100vh-73px)] max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-[1.15fr_0.85fr]">
      <section>
        <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
          Accountable family sponsorship
        </p>
        <h1 className="max-w-3xl text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">
          Support with dignity. Follow every meaningful step.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">
          Kafil connects verified needs, responsible partners, and sponsors while
          protecting every family&apos;s private information.
        </p>
        <div className="mt-9 flex flex-wrap gap-4">
          <Link
            className="rounded-full bg-emerald-700 px-6 py-3 font-medium text-white transition hover:bg-emerald-800"
            href="/login"
          >
            Sign in
          </Link>
          <Link
            className="rounded-full border border-emerald-200 bg-white px-6 py-3 font-medium text-emerald-800 transition hover:border-emerald-300"
            href="/register/sponsor"
          >
            Become a sponsor
          </Link>
          <a
            className="rounded-full border border-stone-300 bg-white px-6 py-3 font-medium transition hover:border-stone-400"
            href="#principles"
          >
            How trust works
          </a>
        </div>
      </section>

      <section
        id="principles"
        className="rounded-3xl border border-emerald-100 bg-emerald-950 p-8 text-emerald-50 shadow-2xl shadow-emerald-950/10"
      >
        <p className="text-sm font-medium text-emerald-300">Foundation principles</p>
        <ul className="mt-6 space-y-5">
          {[
            "Private family records stay separate from public cases.",
            "Every sensitive action is authorized and auditable.",
            "Payments and distributions remain explainable end to end.",
          ].map((principle) => (
            <li className="flex gap-3 leading-7" key={principle}>
              <span aria-hidden="true" className="text-emerald-400">
                ●
              </span>
              {principle}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
