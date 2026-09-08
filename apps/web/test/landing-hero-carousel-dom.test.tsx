import { afterAll, beforeEach, describe, expect, jest, test } from "bun:test";
import { Window } from "happy-dom";

// ---------------------------------------------------------------------------
// Shared-process DOM bootstrap.
//
// `bun test` runs every file in one process with a shared globalThis, so this
// file installs a happy-dom window up front and removes every added global
// (restoring overwritten ones) in `afterAll`, leaving later suites untouched.
// ---------------------------------------------------------------------------

const globalSnapshot = new Map<string, PropertyDescriptor | undefined>();
for (const key of Object.getOwnPropertyNames(globalThis)) {
  globalSnapshot.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
}

const happyWindow = new Window({ url: "http://localhost/" });
const happyFields = happyWindow as unknown as Record<string, unknown>;
for (const key of Object.getOwnPropertyNames(happyWindow)) {
  if (!(key in globalThis)) {
    (globalThis as Record<string, unknown>)[key] = happyFields[key];
  }
}
const testGlobals = globalThis as Record<string, unknown>;
testGlobals.window = happyWindow;
testGlobals.document = happyWindow.document;
testGlobals.IS_REACT_ACT_ENVIRONMENT = true;

function restoreGlobals() {
  for (const key of Object.getOwnPropertyNames(globalThis)) {
    if (!globalSnapshot.has(key)) {
      delete testGlobals[key];
    } else {
      const descriptor = globalSnapshot.get(key);
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    }
  }
}

// Dynamic imports: @testing-library/react binds `document` at import time,
// so it must load after the happy-dom globals exist (static imports hoist).
const { act } = await import("react");
const { cleanup, fireEvent, render, screen } = await import("@testing-library/react");
const { I18nProvider } = await import("najm-i18n/react");
const { kafilUiI18n } = await import("@kafil/server/locales");
const { LandingHeroCarousel } = await import(
  "../src/features/Landing/components/LandingHeroCarousel"
);
const { LANDING_CAROUSEL_INTERVAL_MS } = await import(
  "../src/features/Landing/hooks/useLandingHeroCarousel"
);

// ---------------------------------------------------------------------------
// Controllable browser surfaces.
// ---------------------------------------------------------------------------

type MediaChangeListener = (event: { matches: boolean; media: string }) => void;

interface ControllableMediaQueryList {
  readonly media: string;
  readonly matches: boolean;
  addEventListener(type: string, listener: MediaChangeListener): void;
  removeEventListener(type: string, listener: MediaChangeListener): void;
  addListener(listener: MediaChangeListener): void;
  removeListener(listener: MediaChangeListener): void;
}

function stubMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<MediaChangeListener>();
  const mql: ControllableMediaQueryList = {
    media: "(prefers-reduced-motion: reduce)",
    get matches() {
      return matches;
    },
    addEventListener: (_type, listener) => {
      listeners.add(listener);
    },
    removeEventListener: (_type, listener) => {
      listeners.delete(listener);
    },
    addListener: (listener) => {
      listeners.add(listener);
    },
    removeListener: (listener) => {
      listeners.delete(listener);
    },
  };
  const matchMedia = () => mql;
  happyWindow.matchMedia = matchMedia as unknown as typeof happyWindow.matchMedia;
  testGlobals.matchMedia = matchMedia;
  return {
    setMatches(next: boolean) {
      matches = next;
      for (const listener of [...listeners]) listener({ matches, media: mql.media });
    },
  };
}

let hiddenValue = false;
Object.defineProperty(happyWindow.document, "hidden", {
  configurable: true,
  get: () => hiddenValue,
});

function setDocumentHidden(next: boolean) {
  hiddenValue = next;
  happyWindow.document.dispatchEvent(new happyWindow.Event("visibilitychange"));
}

function renderCarousel(language: "ar" | "en" | "es" | "fr" = "en") {
  return render(
    <I18nProvider
      translations={kafilUiI18n.translations}
      initialLanguage={language}
      defaultLanguage="en"
      fallbackToDefaultLanguage
    >
      <LandingHeroCarousel key={language} />
    </I18nProvider>,
  );
}

function carouselRegion() {
  return screen.getByRole("region", { name: "Family support highlights" });
}

function layerCount(container: HTMLElement) {
  return container.querySelectorAll('[aria-roledescription="carousel"] img').length;
}

function advance(ms: number) {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  cleanup();
  jest.useFakeTimers();
  stubMatchMedia(false);
  setDocumentHidden(false);
});

afterAll(() => {
  cleanup();
  jest.useRealTimers();
  restoreGlobals();
});

describe("landing hero carousel component", () => {
  test("renders the first locale slide statically with manual controls", () => {
    const { container } = renderCarousel("en");

    expect(screen.getByText("Slide 1 of 2")).toBeTruthy();
    expect(layerCount(container)).toBe(1);
    expect(screen.getByRole("button", { name: "Previous slide" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Next slide" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pause rotation" })).toBeTruthy();

    advance(LANDING_CAROUSEL_INTERVAL_MS - 1);
    expect(screen.getByText("Slide 1 of 2")).toBeTruthy();
  });

  test("advances once per window and drops the outgoing layer after the crossfade", () => {
    const { container } = renderCarousel("en");

    advance(LANDING_CAROUSEL_INTERVAL_MS);
    expect(screen.getByText("Slide 2 of 2")).toBeTruthy();
    // Both layers stay mounted for the 650 ms crossfade, then only current.
    expect(layerCount(container)).toBe(2);
    advance(650);
    expect(layerCount(container)).toBe(1);

    advance(LANDING_CAROUSEL_INTERVAL_MS);
    expect(screen.getByText("Slide 1 of 2")).toBeTruthy();
  });

  test("hover pauses rotation and leaving resumes it", () => {
    renderCarousel("en");
    const region = carouselRegion();

    fireEvent.mouseOver(region);
    advance(6000);
    expect(screen.getByText("Slide 1 of 2")).toBeTruthy();

    fireEvent.mouseOut(region);
    advance(LANDING_CAROUSEL_INTERVAL_MS);
    expect(screen.getByText("Slide 2 of 2")).toBeTruthy();
  });

  test("focus inside pauses, moving between controls stays paused, leaving resumes", () => {
    renderCarousel("en");
    const next = screen.getByRole("button", { name: "Next slide" });
    const previous = screen.getByRole("button", { name: "Previous slide" });

    fireEvent.focus(next);
    advance(6000);
    expect(screen.getByText("Slide 1 of 2")).toBeTruthy();

    // Moving focus to another control inside the frame keeps the pause.
    fireEvent.blur(next, { relatedTarget: previous });
    fireEvent.focus(previous, { relatedTarget: next });
    advance(6000);
    expect(screen.getByText("Slide 1 of 2")).toBeTruthy();

    // Focus truly leaving the frame resumes rotation.
    fireEvent.blur(previous, { relatedTarget: null });
    advance(LANDING_CAROUSEL_INTERVAL_MS);
    expect(screen.getByText("Slide 2 of 2")).toBeTruthy();
  });

  test("a hidden document pauses rotation and visibility resumes it", () => {
    renderCarousel("en");

    act(() => {
      setDocumentHidden(true);
    });
    advance(6000);
    expect(screen.getByText("Slide 1 of 2")).toBeTruthy();

    act(() => {
      setDocumentHidden(false);
    });
    advance(LANDING_CAROUSEL_INTERVAL_MS);
    expect(screen.getByText("Slide 2 of 2")).toBeTruthy();
  });

  test("user Pause holds the slide while manual navigation still works", () => {
    renderCarousel("en");

    fireEvent.click(screen.getByRole("button", { name: "Pause rotation" }));
    expect(screen.getByRole("button", { name: "Resume rotation" })).toBeTruthy();
    advance(6000);
    expect(screen.getByText("Slide 1 of 2")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Next slide" }));
    expect(screen.getByText("Slide 2 of 2")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Resume rotation" }));
    advance(LANDING_CAROUSEL_INTERVAL_MS);
    expect(screen.getByText("Slide 1 of 2")).toBeTruthy();
  });

  test("rapid reverse navigation never renders duplicate keyed slide layers", () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      renderCarousel("en");

      fireEvent.click(screen.getByRole("button", { name: "Next slide" }));
      fireEvent.click(screen.getByRole("button", { name: "Previous slide" }));

      expect(screen.getByText("Slide 1 of 2")).toBeTruthy();
      expect(
        consoleError.mock.calls.some((parts) =>
          parts.some((part) => String(part).includes("same key")),
        ),
      ).toBe(false);
    } finally {
      consoleError.mockRestore();
    }
  });

  test("a locale remount resets to slide 1 with the new manifest", () => {
    const { container, rerender } = renderCarousel("en");
    advance(LANDING_CAROUSEL_INTERVAL_MS);
    expect(screen.getByText("Slide 2 of 2")).toBeTruthy();

    rerender(
      <I18nProvider
        key="ar"
        translations={kafilUiI18n.translations}
        initialLanguage="ar"
        defaultLanguage="en"
        fallbackToDefaultLanguage
      >
        <LandingHeroCarousel key="ar" />
      </I18nProvider>,
    );

    expect(screen.getByText("الشريحة 1 من 2")).toBeTruthy();
    const sources = [...container.querySelectorAll('[aria-roledescription="carousel"] img')].map(
      (image) => (image as HTMLImageElement).src,
    );
    expect(sources.some((src) => src.includes("hero-family_ar"))).toBe(true);
    expect(sources.some((src) => src.includes("hero-family_en"))).toBe(false);
  });

  test("reduced motion stays static while manual navigation still works", () => {
    stubMatchMedia(true);
    renderCarousel("en");

    advance(8000);
    expect(screen.getByText("Slide 1 of 2")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Next slide" }));
    expect(screen.getByText("Slide 2 of 2")).toBeTruthy();
  });
});
