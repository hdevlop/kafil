import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { NEmptyState, NErrorState } from "najm-kit";

import { KAFIL_FEEDBACK_DEFAULTS } from "../src/i18n/feedbackDefaults";
import { getNestedTranslation, uiTranslations } from "../src/i18n/translations";
import {
  KafilApiError,
  getPublicApiErrorMessage,
} from "../src/services/apiError";

const webRoot = join(import.meta.dir, "..");
const sourceRoot = join(webRoot, "src");

describe("Najm Kit page-state adoption", () => {
  test("maps every shared feedback field to a translated Kafil catalog key", () => {
    expect(KAFIL_FEEDBACK_DEFAULTS.labelKeys).toEqual({
      loadingLabel: "state.loading",
      emptyTitle: "state.empty",
      errorTitle: "state.error",
      errorMessage: "state.retry",
      retryLabel: "action.retry",
      forbiddenTitle: "state.forbiddenTitle",
      forbiddenDescription: "state.forbiddenDescription",
      notFoundTitle: "state.notFoundTitle",
      notFoundDescription: "state.notFoundDescription",
    });

    for (const catalog of Object.values(uiTranslations)) {
      for (const key of Object.values(KAFIL_FEEDBACK_DEFAULTS.labelKeys)) {
        expect(getNestedTranslation(catalog, key)).toBeTruthy();
      }
    }
  });

  test("mounts the stable defaults once on NajmAppProvider", () => {
    const provider = readFileSync(
      join(sourceRoot, "providers/AppProviders.tsx"),
      "utf8",
    );

    expect(provider).toContain("feedbackDefaults={KAFIL_FEEDBACK_DEFAULTS}");
  });

  test("uses direct package states and removes the generic Kafil wrapper", () => {
    expect(existsSync(join(sourceRoot, "shared/PageState.tsx"))).toBe(false);

    for (const relativePath of readdirSync(sourceRoot, {
      encoding: "utf8",
      recursive: true,
    }) as string[]) {
      if (!relativePath.endsWith(".ts") && !relativePath.endsWith(".tsx")) continue;
      const source = readFileSync(join(sourceRoot, relativePath), "utf8");
      expect(source).not.toContain("@/shared/PageState");
    }

    const forbidden = readFileSync(
      join(sourceRoot, "app/(dashboard)/forbidden/page.tsx"),
      "utf8",
    );
    const notFound = readFileSync(join(sourceRoot, "app/not-found.tsx"), "utf8");
    expect(forbidden).toContain('NForbiddenState } from "najm-kit/app"');
    expect(notFound).toContain('NNotFoundState } from "najm-kit/app"');
    expect(forbidden).toContain("<DashboardReturnAction />");
    expect(notFound).toContain("<DashboardReturnAction />");
  });

  test("panel feedback renders without introducing a main landmark", () => {
    const empty = renderToStaticMarkup(
      <NEmptyState surface="panel" title="No records" />,
    );
    const error = renderToStaticMarkup(
      <NErrorState surface="panel" message="Try again" />,
    );

    expect(empty).toContain("No records");
    expect(error).toContain("Try again");
    expect(empty).not.toContain("<main");
    expect(error).not.toContain("<main");
  });

  test("discloses API response copy but hides arbitrary error messages", () => {
    const publicError = new KafilApiError("Public message", {
      body: { message: "Public message" },
      status: 422,
    });

    expect(getPublicApiErrorMessage(publicError, "Safe fallback")).toBe(
      "Public message",
    );
    expect(
      getPublicApiErrorMessage(
        new Error("DATABASE_URL includes internal host details"),
        "Safe fallback",
      ),
    ).toBe("Safe fallback");
  });
});
