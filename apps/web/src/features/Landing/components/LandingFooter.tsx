"use client";

import Link from "next/link";
import { NButton } from "najm-kit";
import { NThemeImage } from "najm-theme/react";
import { useTranslation } from "najm-i18n/react";

import { LANDING_ANCHORS, LANDING_ROUTES } from "../config/landingContent";

export function LandingFooter() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  const exploreLinks = [
    { href: LANDING_ROUTES.home, label: t("landing.header.home") },
    { href: `#${LANDING_ANCHORS.families}`, label: t("landing.header.families") },
    { href: `#${LANDING_ANCHORS.howItWorks}`, label: t("landing.header.howItWorks") },
    { href: `#${LANDING_ANCHORS.contact}`, label: t("landing.header.contact") },
  ];

  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 md:grid-cols-[1.2fr_0.8fr_1fr]">
        <div>
          <Link href={LANDING_ROUTES.home} className="inline-flex items-center gap-2 rounded-md" aria-label={`Kafil — ${t("landing.header.home")}`}>
            <NThemeImage slot="sidebarLogoExpanded" alt="Kafil" className="h-8 w-auto" />
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
            {t("landing.footer.tagline")}
          </p>
        </div>

        <nav aria-label={t("landing.footer.navTitle")}>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            {t("landing.footer.navTitle")}
          </h2>
          <ul className="mt-3 space-y-1.5">
            {exploreLinks.map((link) => (
              <li key={link.href + link.label}>
                <Link href={link.href} className="rounded-sm text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-primary">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div id={LANDING_ANCHORS.contact} className="scroll-mt-24">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            {t("landing.footer.contactTitle")}
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {t("landing.footer.contactText")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <NButton asChild size="sm">
              <Link href={LANDING_ROUTES.apply}>{t("landing.footer.applyCta")}</Link>
            </NButton>
            <NButton asChild size="sm" variant="outline">
              <Link href={LANDING_ROUTES.login}>{t("landing.footer.loginCta")}</Link>
            </NButton>
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted-foreground sm:px-6">
          {t("landing.footer.rights", { year })}
        </p>
      </div>
    </footer>
  );
}
