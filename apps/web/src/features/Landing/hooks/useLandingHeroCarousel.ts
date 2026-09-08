"use client";

import { useCallback, useEffect, useState } from "react";
import { useMediaQuery } from "najm-kit";

import type { HeroSlide } from "../types";

export const LANDING_CAROUSEL_INTERVAL_MS = 5000;
export const LANDING_CAROUSEL_TRANSITION_MS = 650;

export function getNextIndex(current: number, total: number): number {
  if (total <= 0) return 0;
  return (current + 1) % total;
}

export function getPrevIndex(current: number, total: number): number {
  if (total <= 0) return 0;
  return (current - 1 + total) % total;
}

export function shouldShowCarouselControls(slideCount: number): boolean {
  return slideCount > 1;
}

// Focus-within guard for the carousel frame: moving focus between controls
// inside the frame must keep rotation paused. Only focus that actually leaves
// the frame (or has no target, e.g. focus moving to the browser chrome)
// clears the pause.
export function shouldClearFocusPause(
  currentTarget: { contains(node: Node | null): boolean },
  relatedTarget: unknown,
): boolean {
  if (relatedTarget === null || relatedTarget === undefined) return true;
  return !currentTarget.contains(relatedTarget as Node);
}

export interface CarouselRotationInput {
  slideCount: number;
  userPaused: boolean;
  hoverPaused: boolean;
  focusPaused: boolean;
  documentHidden: boolean;
  reducedMotion: boolean;
}

// Pure rotation guard shared by the hook and the source tests: automatic
// rotation runs only with multiple slides and zero pause reasons.
export function shouldAutoRotate(input: CarouselRotationInput): boolean {
  return (
    input.slideCount > 1 &&
    !input.userPaused &&
    !input.hoverPaused &&
    !input.focusPaused &&
    !input.documentHidden &&
    !input.reducedMotion
  );
}

export interface CarouselClock {
  schedule: (callback: () => void, delayMs: number) => unknown;
  cancel: (id: unknown) => void;
}

const systemClock: CarouselClock = {
  schedule: (callback, delayMs) => setTimeout(callback, delayMs),
  cancel: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
};

// Single resettable timer with a generation guard: restarting or cancelling
// invalidates any pending tick, so re-renders and React Strict Mode's
// mount-cleanup-mount cycle can never accumulate intervals or double-fire.
export function createCarouselTimer(clock: CarouselClock = systemClock) {
  let pending: unknown;
  let generation = 0;
  return {
    restart(callback: () => void, delayMs: number) {
      if (pending !== undefined) {
        clock.cancel(pending);
        pending = undefined;
      }
      generation += 1;
      const current = generation;
      pending = clock.schedule(() => {
        if (current !== generation) return;
        pending = undefined;
        callback();
      }, delayMs);
    },
    cancel() {
      generation += 1;
      if (pending !== undefined) {
        clock.cancel(pending);
        pending = undefined;
      }
    },
  };
}

export type CarouselTimer = ReturnType<typeof createCarouselTimer>;

export interface LandingHeroCarouselState {
  index: number;
  isPaused: boolean;
  canRotate: boolean;
  next: () => void;
  prev: () => void;
  goTo: (nextIndex: number) => void;
  togglePaused: () => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onFocusInside: () => void;
  onFocusOutside: () => void;
}

// Local timer/pause/visibility state machine for the locale-matched hero
// slides. The first slide renders deterministically (index 0); rotation
// starts after hydration via a single cleanup-safe timeout that is reset on
// every slide change, language change, or pause-reason change.
export function useLandingHeroCarousel(
  slides: readonly HeroSlide[],
  resetKey: string,
): LandingHeroCarouselState {
  const [index, setIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [focusPaused, setFocusPaused] = useState(false);
  const [documentHidden, setDocumentHidden] = useState(
    () => typeof document !== "undefined" && document.hidden,
  );
  // Kit-owned media query with a server snapshot of false: the first render
  // is deterministically static and rotation starts after hydration.
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  // Language-scoped reset without an effect: when the reset key changes the
  // next render starts back at slide 0 instead of carrying an index from a
  // longer list into a shorter one. (The carousel is also remounted per
  // language by its parent, so this is a second guard, not the mechanism.)
  const [activeKey, setActiveKey] = useState(resetKey);
  if (activeKey !== resetKey) {
    setActiveKey(resetKey);
    setIndex(0);
  }

  useEffect(() => {
    const onVisibility = () => setDocumentHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const canRotate = shouldAutoRotate({
    slideCount: slides.length,
    userPaused,
    hoverPaused,
    focusPaused,
    documentHidden,
    reducedMotion,
  });

  const [timer] = useState(() => createCarouselTimer());

  // One cleanup-safe, resettable timer: every slide change, language change,
  // or pause-reason change restarts a fresh five-second window. The cleanup
  // cancels the pending tick, so re-renders and Strict Mode never accumulate
  // intervals; the generation guard never lets a stale tick "catch up".
  useEffect(() => {
    if (!canRotate) {
      timer.cancel();
      return;
    }
    timer.restart(() => {
      setIndex((current) => getNextIndex(current, slides.length));
    }, LANDING_CAROUSEL_INTERVAL_MS);
    return () => timer.cancel();
  }, [canRotate, index, slides.length, timer]);

  const next = useCallback(() => {
    setIndex((current) => getNextIndex(current, slides.length));
  }, [slides.length]);

  const prev = useCallback(() => {
    setIndex((current) => getPrevIndex(current, slides.length));
  }, [slides.length]);

  const goTo = useCallback(
    (nextIndex: number) => {
      if (slides.length === 0) return;
      const clamped = ((nextIndex % slides.length) + slides.length) % slides.length;
      setIndex(clamped);
    },
    [slides.length],
  );

  const togglePaused = useCallback(() => setUserPaused((paused) => !paused), []);
  const onHoverStart = useCallback(() => setHoverPaused(true), []);
  const onHoverEnd = useCallback(() => setHoverPaused(false), []);
  const onFocusInside = useCallback(() => setFocusPaused(true), []);
  const onFocusOutside = useCallback(() => setFocusPaused(false), []);

  return {
    index,
    isPaused: userPaused,
    canRotate,
    next,
    prev,
    goTo,
    togglePaused,
    onHoverStart,
    onHoverEnd,
    onFocusInside,
    onFocusOutside,
  };
}
