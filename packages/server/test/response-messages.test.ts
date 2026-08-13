import { describe, expect, it } from "bun:test";
import { getResponseMessage, getRoutes } from "najm-core";

import * as modules from "../src/modules";
import translations from "../src/locales";

type ControllerConstructor = {
  name: string;
  prototype: object;
};

/**
 * The two `najm-theme` cutover redirects are excluded.
 *
 * They answer 308/307 with a `location` header and no body, so there is no
 * response to name — and they are temporary by construction (root `PLAN.md`
 * Phase 5). Their own coverage is in `theme-adoption.test.ts`.
 */
const COMPAT_CONTROLLERS = new Set([
  "ThemePresetCompatController",
  "BrandingAssetCompatController",
]);

const controllers = Object.values(modules)
  .filter(
    (value) =>
      typeof value === "function" &&
      value.name.endsWith("Controller") &&
      !COMPAT_CONTROLLERS.has(value.name),
  )
  .map((value) => value as unknown as ControllerConstructor);

function getNestedTranslation(dictionary: unknown, key: string): string | undefined {
  const value = key.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[segment];
  }, dictionary);

  return typeof value === "string" ? value : undefined;
}

function controller(name: string) {
  const value = controllers.find((item) => item.name === name);
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

describe("server response message contract", () => {
it("assigns a direct, domain-specific response key to every controller endpoint", () => {
    // 23 since najm-theme.md Move 8 retired the Appearance, Branding, and
    // ThemePreset controllers. Their routes are the package's now, and its
    // response keys ship in its own catalogs.
    expect(controllers).toHaveLength(23);

    const routes = controllers.flatMap((current) =>
      getRoutes(current).map((route) => ({ controller: current, route })),
    );

    // 181 = the previous 180 routes plus the admin-only applicant cleanup
    // command.
    expect(routes).toHaveLength(181);

    for (const { controller: current, route } of routes) {
      const response = getResponseMessage(current, String(route.methodName));

      expect(response?.message).toMatch(/^[a-zA-Z]+\.success\.[a-zA-Z]+$/);
      expect(response?.message).not.toMatch(/^responses\.success\./);

      for (const dictionary of Object.values(translations)) {
        expect(getNestedTranslation(dictionary, String(response?.message))).toEqual(
          expect.any(String),
        );
      }
    }
  });

  it("keeps semantic messages for lifecycle and financial commands", () => {
    expect(getResponseMessage(controller("FamilyController"), "deactivate")?.message)
      .toBe("families.success.deactivated");
    expect(getResponseMessage(controller("ContributionController"), "validate")?.message)
      .toBe("contributions.success.validated");
    expect(getResponseMessage(controller("ContributionController"), "record")?.message)
      .toBe("contributions.success.recorded");
    expect(getResponseMessage(controller("ContributionController"), "refund")?.message)
      .toBe("contributions.success.refunded");
    expect(getResponseMessage(controller("ContributionController"), "bulkDelete")?.message)
      .toBe("contributions.success.deleted");
    expect(getResponseMessage(controller("ContributionController"), "delete")?.message)
      .toBe("contributions.success.deleted");
    expect(getResponseMessage(controller("CatalogController"), "deleteCategory")?.message)
      .toBe("catalog.success.deleted");
    expect(getResponseMessage(controller("CatalogController"), "deleteProduct")?.message)
      .toBe("catalog.success.deleted");
    expect(getResponseMessage(controller("OrderController"), "approve")?.message)
      .toBe("orders.success.approved");
    expect(getResponseMessage(controller("OrderController"), "assignDelivery")?.message)
      .toBe("orders.success.deliveryAssigned");
    expect(getResponseMessage(controller("OrderController"), "failDelivery")?.message)
      .toBe("orders.success.deliveryFailed");
    expect(getResponseMessage(controller("OrderController"), "deliver")?.message)
      .toBe("orders.success.delivered");
    expect(getResponseMessage(controller("OrderController"), "delete")?.message)
      .toBe("orders.success.deleted");
  });
});
