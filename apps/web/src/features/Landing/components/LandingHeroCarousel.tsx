"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { NButton } from "najm-kit";
import { NNextImage } from "najm-kit/next";
import { useTranslation } from "najm-i18n/react";
import type { KafilLocale } from "@kafil/server/locales";

import { heroSlidesByLanguage } from "../config/landingHeroSlides";
import {
  LANDING_CAROUSEL_TRANSITION_MS,
  shouldClearFocusPause,
  shouldShowCarouselControls,
  useLandingHeroCarousel,
} from "../hooks/useLandingHeroCarousel";

function resolveSlides(language: string) {
  return (heroSlidesByLanguage as Record<string, (typeof heroSlidesByLanguage)["en"]>)[language] ?? heroSlidesByLanguage.en;
}

// Client-only rotation/control island. Hero heading, copy, CTAs, and trust
// content stay stable in the parent; only this image frame rotates.
export function LandingHeroCarousel() {
  const { language, t } = useTranslation();
  const locale = language as KafilLocale;
  const slides = resolveSlides(locale);
  const carousel = useLandingHeroCarousel(slides, locale);
  const { index } = carousel;
  const multi = shouldShowCarouselControls(slides.length);

  const [outgoing, setOutgoing] = useState<number | null>(null);
  const previousRef = useRef(0);

  // Crossfade bookkeeping: keep the outgoing layer mounted for the
  // transition duration, then drop it so only the current layer remains.
  useEffect(() => {
    if (previousRef.current === index) return;
    const previous = previousRef.current;
    previousRef.current = index;
    setOutgoing(previous);
    // Global timer (identical to window.* in browsers) so fake-timer
    // component tests can advance the transition deterministically.
    const id = setTimeout(() => setOutgoing(null), LANDING_CAROUSEL_TRANSITION_MS);
    return () => clearTimeout(id);
  }, [index]);

  // Next slide to warm: resolved declaratively so the preload below tracks
  // rotation without its own timer.
  const nextSlide = multi && slides.length > 1 ? slides[(index + 1) % slides.length] : undefined;

  // Rapid manual navigation can return to the slide that is still marked as
  // outgoing. Render it once during that transient frame so React never sees
  // duplicate keys or duplicate image layers.
  const layers = outgoing === null || outgoing === index ? [index] : [outgoing, index];

  return (
    <>
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={t("landing.hero.carouselLabel")}
      aria-describedby="landing-hero-position"
      className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-border/60"
      onMouseEnter={carousel.onHoverStart}
      onMouseLeave={carousel.onHoverEnd}
      onFocus={carousel.onFocusInside}
      onBlur={(event) => {
        if (shouldClearFocusPause(event.currentTarget, event.relatedTarget)) {
          carousel.onFocusOutside();
        }
      }}
    >
      {layers.map((slidePosition) => {
        const slide = slides[slidePosition];
        if (!slide) return null;
        const isCurrent = slidePosition === index;
        const isFirstSlide = slidePosition === 0;
        return (
          <div
            key={`${slide.id}-${isCurrent ? "current" : "outgoing"}`}
            aria-hidden={!isCurrent}
            className={
              isCurrent
                ? "absolute inset-0 scale-100 opacity-100 transition-opacity transition-transform duration-700 ease-out motion-reduce:transform-none motion-reduce:transition-none"
                : "absolute inset-0 scale-[1.02] opacity-0 transition-opacity transition-transform duration-700 ease-out motion-reduce:transform-none motion-reduce:transition-none"
            }
          >
            <NNextImage
              src={slide.src}
              fallbackSrc={slide.fallbackSrc}
              alt={t(slide.altKey)}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority={isFirstSlide}
              loading={isFirstSlide ? "eager" : "lazy"}
            />
          </div>
        );
      })}

      <p id="landing-hero-position" className="sr-only">
        {t("landing.hero.position", { current: index + 1, total: slides.length })}
      </p>

      {multi ? (
        <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2">
          <NButton
            type="button"
            size="icon"
            variant="secondary"
            className="bg-card/90 shadow-sm"
            aria-label={t("landing.hero.previous")}
            onClick={carousel.prev}
          >
            <ChevronLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
          </NButton>
          <div className="flex items-center gap-1.5 rounded-full bg-card/90 px-2.5 py-2 shadow-sm" role="group" aria-label={t("landing.hero.carouselLabel")}>
            {slides.map((slide, position) => (
              <NButton
                key={slide.id}
                type="button"
                variant="plain"
                size="sm"
                rounded="full"
                aria-label={t("landing.hero.position", { current: position + 1, total: slides.length })}
                aria-current={position === index}
                onClick={() => carousel.goTo(position)}
                className={
                  position === index
                    ? "h-2 min-h-0 w-6 min-w-0 gap-0 p-0 px-0 bg-primary transition-all motion-reduce:transition-none"
                    : "h-2 min-h-0 w-2 min-w-0 gap-0 p-0 px-0 bg-muted-foreground/40 transition-all hover:bg-muted-foreground motion-reduce:transition-none"
                }
              >
                <span aria-hidden="true" className="sr-only">
                  {position + 1}
                </span>
              </NButton>
            ))}
          </div>
          <NButton
            type="button"
            size="icon"
            variant="secondary"
            className="bg-card/90 shadow-sm"
            aria-label={t(carousel.isPaused ? "landing.hero.play" : "landing.hero.pause")}
            aria-pressed={carousel.isPaused}
            onClick={carousel.togglePaused}
          >
            {carousel.isPaused ? (
              <Play aria-hidden="true" className="size-4" />
            ) : (
              <Pause aria-hidden="true" className="size-4" />
            )}
          </NButton>
          <NButton
            type="button"
            size="icon"
            variant="secondary"
            className="bg-card/90 shadow-sm"
            aria-label={t("landing.hero.next")}
            onClick={carousel.next}
          >
            <ChevronRight aria-hidden="true" className="size-4 rtl:rotate-180" />
          </NButton>
        </div>
      ) : null}
    </div>
    {/* Warm the next slide through the same NNextImage optimizer (low
        priority) instead of fetching the raw public path with `new Image()`,
        which would download separate bytes from the optimized rendition the
        carousel actually renders. Kept outside the carousel region so
        rotation layers, position text, and image counts stay scoped to the
        visible slides; only the active locale's next slide is ever warmed. */}
    {nextSlide ? (
      <div aria-hidden="true" className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0">
        <NNextImage
          src={nextSlide.src}
          fallbackSrc={nextSlide.fallbackSrc}
          alt=""
          width={nextSlide.width}
          height={nextSlide.height}
          sizes="(max-width: 768px) 100vw, 50vw"
          loading="eager"
          fetchPriority="low"
        />
      </div>
    ) : null}
    </>
  );
}
