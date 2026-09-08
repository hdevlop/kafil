import { describe, expect, test } from "bun:test";

import { heroSlidesByLanguage } from "../src/features/Landing/config/landingHeroSlides";
import {
  LANDING_CAROUSEL_INTERVAL_MS,
  LANDING_CAROUSEL_TRANSITION_MS,
  createCarouselTimer,
  getNextIndex,
  getPrevIndex,
  shouldAutoRotate,
  shouldShowCarouselControls,
  type CarouselClock,
} from "../src/features/Landing/hooks/useLandingHeroCarousel";

// Deterministic virtual clock: the production timer only sees schedule and
// cancel, so advancing virtual time here exercises the exact accumulation,
// reset, and cleanup semantics the hook relies on — without a DOM.
function createVirtualClock() {
  let now = 0;
  let sequence = 0;
  const pending = new Map<number, { at: number; callback: () => void }>();
  const clock: CarouselClock = {
    schedule: (callback, delayMs) => {
      sequence += 1;
      pending.set(sequence, { at: now + delayMs, callback });
      return sequence;
    },
    cancel: (id) => {
      pending.delete(id as number);
    },
  };
  return {
    clock,
    advance(ms: number) {
      const target = now + ms;
      while (true) {
        let nextId: number | undefined;
        let nextAt = Number.POSITIVE_INFINITY;
        for (const [id, entry] of pending) {
          if (entry.at <= target && entry.at < nextAt) {
            nextId = id;
            nextAt = entry.at;
          }
        }
        if (nextId === undefined) break;
        now = nextAt;
        const entry = pending.get(nextId);
        pending.delete(nextId);
        entry?.callback();
      }
      now = target;
    },
    pendingCount() {
      return pending.size;
    },
  };
}

const CLEAR_ROTATION = {
  slideCount: 2,
  userPaused: false,
  hoverPaused: false,
  focusPaused: false,
  documentHidden: false,
  reducedMotion: false,
};

describe("landing hero carousel timing", () => {
  test("the rotation contract is exactly five seconds with a 600–700 ms crossfade", () => {
    expect(LANDING_CAROUSEL_INTERVAL_MS).toBe(5000);
    expect(LANDING_CAROUSEL_TRANSITION_MS).toBeGreaterThanOrEqual(600);
    expect(LANDING_CAROUSEL_TRANSITION_MS).toBeLessThanOrEqual(700);
  });

  test("4,999 ms does not advance and 5,000 ms advances exactly one slide", () => {
    const virtual = createVirtualClock();
    const timer = createCarouselTimer(virtual.clock);
    let advances = 0;
    timer.restart(() => {
      advances += 1;
    }, LANDING_CAROUSEL_INTERVAL_MS);

    virtual.advance(4999);
    expect(advances).toBe(0);
    virtual.advance(1);
    expect(advances).toBe(1);
    // A fired tick never repeats on its own: the hook reschedules per slide.
    virtual.advance(5000);
    expect(advances).toBe(1);
  });

  test("manual navigation wraps and restarts a fresh timer", () => {
    expect(getNextIndex(1, 2)).toBe(0);
    expect(getPrevIndex(0, 2)).toBe(1);
    expect(getNextIndex(7, 8)).toBe(0);
    expect(getPrevIndex(0, 8)).toBe(7);
    expect(getNextIndex(0, 0)).toBe(0);

    const virtual = createVirtualClock();
    const timer = createCarouselTimer(virtual.clock);
    let advances = 0;
    timer.restart(() => {
      advances += 1;
    }, LANDING_CAROUSEL_INTERVAL_MS);
    virtual.advance(4000);
    // Manual Previous/Next restarts the window instead of firing early.
    timer.restart(() => {
      advances += 1;
    }, LANDING_CAROUSEL_INTERVAL_MS);
    virtual.advance(4999);
    expect(advances).toBe(0);
    virtual.advance(1);
    expect(advances).toBe(1);
  });

  test("rapid restarts never accumulate pending ticks", () => {
    const virtual = createVirtualClock();
    const timer = createCarouselTimer(virtual.clock);
    let advances = 0;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      timer.restart(() => {
        advances += 1;
      }, LANDING_CAROUSEL_INTERVAL_MS);
    }
    expect(virtual.pendingCount()).toBe(1);
    virtual.advance(5000);
    expect(advances).toBe(1);
  });

  test("cleanup is stable across unmount and Strict Mode remount cycles", () => {
    const virtual = createVirtualClock();
    const timer = createCarouselTimer(virtual.clock);
    let advances = 0;
    const onAdvance = () => {
      advances += 1;
    };
    // Mount, Strict Mode cleanup, remount: only the latest tick may fire.
    timer.restart(onAdvance, LANDING_CAROUSEL_INTERVAL_MS);
    timer.cancel();
    timer.restart(onAdvance, LANDING_CAROUSEL_INTERVAL_MS);
    expect(virtual.pendingCount()).toBe(1);
    virtual.advance(5000);
    expect(advances).toBe(1);
    // Unmount cancels the pending tick entirely.
    timer.restart(onAdvance, LANDING_CAROUSEL_INTERVAL_MS);
    timer.cancel();
    virtual.advance(10_000);
    expect(advances).toBe(1);
  });

  test("every pause reason stops auto-rotation without losing the slide", () => {
    expect(shouldAutoRotate(CLEAR_ROTATION)).toBe(true);
    expect(shouldAutoRotate({ ...CLEAR_ROTATION, userPaused: true })).toBe(false);
    expect(shouldAutoRotate({ ...CLEAR_ROTATION, hoverPaused: true })).toBe(false);
    expect(shouldAutoRotate({ ...CLEAR_ROTATION, focusPaused: true })).toBe(false);
    expect(shouldAutoRotate({ ...CLEAR_ROTATION, documentHidden: true })).toBe(false);
    expect(shouldAutoRotate({ ...CLEAR_ROTATION, reducedMotion: true })).toBe(false);
  });

  test("one-slide locales render statically with no controls or timer", () => {
    expect(shouldShowCarouselControls(0)).toBe(false);
    expect(shouldShowCarouselControls(1)).toBe(false);
    expect(shouldShowCarouselControls(2)).toBe(true);
    expect(shouldAutoRotate({ ...CLEAR_ROTATION, slideCount: 1 })).toBe(false);
  });

  test("switching language replaces the full slide list at slide 0", () => {
    const english = heroSlidesByLanguage.en.map((slide) => slide.src);
    const arabic = heroSlidesByLanguage.ar.map((slide) => slide.src);
    expect(english).toHaveLength(2);
    expect(arabic).toHaveLength(2);
    expect(english).not.toEqual(arabic);
    // Index state is positional: a fresh list always starts at position 0
    // rather than carrying an index from the previous language.
    expect(getNextIndex(0, arabic.length)).toBe(1);
    expect(getPrevIndex(0, arabic.length)).toBe(arabic.length - 1);
  });
});
