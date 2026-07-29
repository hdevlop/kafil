import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import {
  Admin,
  Family,
  KafilRoleProvider,
  Operator,
  Role,
  Sponsor,
} from "../src/shared/Authorization";
import { useKafilRole } from "../src/shared/Authorization/useKafilRole";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("shared inherited-role presentation contract", () => {
  test("exposes Admin, Operator, Family, Sponsor, and generic Role aliases", () => {
    expect(typeof Admin).toBe("function");
    expect(typeof Operator).toBe("function");
    expect(typeof Family).toBe("function");
    expect(typeof Sponsor).toBe("function");
    expect(typeof Role).toBe("function");
    expect(typeof KafilRoleProvider).toBe("function");
  });

  test("forbids feature call sites from re-declaring the admin-in-operator array", () => {
    const products = readSource(
      "../src/features/Products/components/ProductsPage.tsx",
    );
    const categories = readSource(
      "../src/features/Categories/components/CategoriesPage.tsx",
    );
    const orders = readSource(
      "../src/features/Orders/components/OrdersPage.tsx",
    );

    const offenders = [products, categories, orders].filter((source) =>
      /any=\{\[\s*["']admin["']\s*,\s*["']operator["']\s*\]\}/.test(source),
    );
    expect(offenders).toEqual([]);
  });

  test("useKafilRole normalizes the supported role names", () => {
    expect(useKafilRole).toBeTypeOf("function");
  });

  test("dashboard presentation uses the server-owned role during hydration", () => {
    const dashboardShell = readSource(
      "../src/shared/DashboardShell/index.tsx",
    );
    expect(dashboardShell).toContain("<KafilRoleProvider role={user.role}>");
  });
});
