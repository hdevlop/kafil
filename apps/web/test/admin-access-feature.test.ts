import { describe, expect, test } from "bun:test";

import { getUiTranslation } from "../src/i18n/translations";
import { getDashboardNavigation } from "../src/shared/DashboardShell";

describe("admin access management feature", () => {
  test("shows access management only to admins", () => {
    const operator = getDashboardNavigation("operator");
    const admin = getDashboardNavigation("admin");
    const accessIds = ["/users", "/roles", "/permissions"];

    expect(operator.map((item) => item.id)).not.toEqual(
      expect.arrayContaining(accessIds),
    );
    expect(admin.map((item) => item.id)).toEqual(
      expect.arrayContaining(accessIds),
    );
    expect(
      admin
        .filter((item) => accessIds.includes(item.id))
        .map((item) => item.sectionLabel),
    ).toEqual(["nav.accessManagement", undefined, undefined]);
  });

  test("protects direct routes and keeps fixed roles read-only", async () => {
    // Each access route guards itself now that the /operator/access segment is
    // gone — there is no shared layout left to carry the check.
    const accessRoutes = ["users", "roles", "permissions"];
    const [guards, roles, permissions] = await Promise.all([
      Promise.all(
        accessRoutes.map((route) =>
          Bun.file(
            new URL(
              `../src/app/(dashboard)/${route}/page.tsx`,
              import.meta.url,
            ),
          ).text(),
        ),
      ),
      Bun.file(
        new URL(
          "../src/features/AdminAccess/components/AdminRolesPage.tsx",
          import.meta.url,
        ),
      ).text(),
      Bun.file(
        new URL(
          "../src/features/AdminAccess/components/AdminPermissionsPage.tsx",
          import.meta.url,
        ),
      ).text(),
    ]);

    for (const guard of guards) {
      expect(guard).toContain('requireRole(["admin"])');
    }
    expect(roles).not.toMatch(/createRole|updateRole|deleteRole/);
    expect(permissions).toContain("CreateAccessPermissionDialogContent");
    expect(permissions).not.toMatch(/updatePermission|deletePermission/);
  });

  test("localizes the responsive admin pages in all supported languages", () => {
    for (const language of ["en", "fr", "ar", "es"] as const) {
      expect(getUiTranslation(language, "adminAccess.users.title")).not.toBe(
        "adminAccess.users.title",
      );
      expect(getUiTranslation(language, "adminAccess.roles.title")).not.toBe(
        "adminAccess.roles.title",
      );
      expect(
        getUiTranslation(language, "adminAccess.permissions.title"),
      ).not.toBe("adminAccess.permissions.title");
      expect(
        getUiTranslation(language, "adminAccess.permissions.create"),
      ).not.toBe("adminAccess.permissions.create");
    }
  });

  test("uses NTable filters for users and permissions", async () => {
    const [usersPage, permissionsPage, userFilters, permissionFilters] =
      await Promise.all([
        Bun.file(
          new URL(
            "../src/features/AdminAccess/components/AdminUsersPage.tsx",
            import.meta.url,
          ),
        ).text(),
        Bun.file(
          new URL(
            "../src/features/AdminAccess/components/AdminPermissionsPage.tsx",
            import.meta.url,
          ),
        ).text(),
        Bun.file(
          new URL(
            "../src/features/AdminAccess/hooks/useAdminUsersTableFilters.ts",
            import.meta.url,
          ),
        ).text(),
        Bun.file(
          new URL(
            "../src/features/AdminAccess/hooks/useAdminPermissionsTableFilters.ts",
            import.meta.url,
          ),
        ).text(),
      ]);

    expect(usersPage).toContain("filters={filters}");
    expect(usersPage).toContain("onCreate={create}");
    expect(usersPage).toContain('className="admin-users-table"');
    expect(usersPage).not.toContain("<NCard>");
    expect(userFilters).toContain('name: "search"');
    expect(userFilters).toContain('name: "verified"');

    expect(permissionsPage).toContain("filters={filters}");
    expect(permissionsPage).toContain("onCreate={create}");
    expect(permissionFilters).toContain('name: "name"');
    expect(permissionFilters).toContain('name: "drift"');
  });
});
