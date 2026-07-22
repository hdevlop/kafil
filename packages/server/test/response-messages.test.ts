import { describe, expect, it } from "bun:test";
import { getResponseMessage, getRoutes } from "najm-core";

import * as modules from "../src/modules";
import translations from "../src/locales";

type ControllerConstructor = {
  name: string;
  prototype: object;
};

const controllers = Object.values(modules)
  .filter(
    (value) => typeof value === "function" && value.name.endsWith("Controller"),
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
    expect(controllers).toHaveLength(18);

    const routes = controllers.flatMap((current) =>
      getRoutes(current).map((route) => ({ controller: current, route })),
    );

    expect(routes).toHaveLength(133);

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
    expect(getResponseMessage(controller("CatalogController"), "restock")?.message)
      .toBe("catalog.success.restocked");
    expect(getResponseMessage(controller("OrderController"), "approve")?.message)
      .toBe("orders.success.approved");
    expect(getResponseMessage(controller("OrderController"), "deliver")?.message)
      .toBe("orders.success.delivered");
  });
});
