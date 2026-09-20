import { describe, expect, test } from "bun:test";

import { kafilUiI18n } from "@kafil/server/locales";

const getUiTranslation = kafilUiI18n.translate;
import { getDashboardNavigation } from "../src/shared/DashboardShell";
import {
  canResetAccess,
  expectedResetMode,
} from "../src/features/AdminAccess/lib/accessReset";
import type { AccessUser } from "../src/features/AdminAccess/types";

const LANGUAGES = ["en", "fr", "ar", "es"] as const;

function accessUser(overrides: Partial<AccessUser>): AccessUser {
  return {
    id: "user-1",
    name: "Example",
    email: "person@example.test",
    emailVerified: true,
    status: "active",
    roleId: "role-1",
    role: "operator",
    lastLogin: null,
    createdAt: null,
    updatedAt: null,
    familyProfileId: null,
    staffProfileId: "staff-1",
    sponsorProfileId: null,
    ...overrides,
  };
}

describe("admin access management feature", () => {
  test("shows access management only to admins", () => {
    const operator = getDashboardNavigation("operator");
    const admin = getDashboardNavigation("admin");
    const accessIds = ["/users", "/roles", "/permissions"];

    const operatorIds = operator.flatMap((item) => [
      item.id,
      ...(item.children ?? []).map((child) => child.id),
    ]);
    const accessGroup = admin.find((item) => item.id === "navigation:access");

    expect(operatorIds).not.toEqual(
      expect.arrayContaining(accessIds),
    );
    expect(accessGroup?.label).toBe("nav.accessManagement");
    expect(accessGroup?.sectionLabel).toBe("nav.settings");
    expect(accessGroup?.children?.map((item) => item.id)).toEqual(accessIds);
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

describe("admin access reset action", () => {
  test("offers each eligible account the workflow that actually applies", () => {
    expect(expectedResetMode(accessUser({ role: "operator" })))
      .toBe("reset_email_sent");
    expect(expectedResetMode(accessUser({ role: "delivery" })))
      .toBe("reset_email_sent");
    expect(
      expectedResetMode(
        accessUser({ role: "sponsor", staffProfileId: null, sponsorProfileId: "sponsor-1" }),
      ),
    ).toBe("reset_email_sent");
    expect(
      expectedResetMode(
        accessUser({ role: "family", staffProfileId: null, familyProfileId: "family-1" }),
      ),
    ).toBe("family_credential_setup");
    expect(expectedResetMode(accessUser({ role: "operator", status: "pending" })))
      .toBe("invitation_resent");
    expect(
      expectedResetMode(
        accessUser({
          role: "sponsor",
          status: "pending",
          staffProfileId: null,
          sponsorProfileId: "sponsor-1",
        }),
      ),
    ).toBe("invitation_resent");
  });

  test("offers nothing for an account this command must not touch", () => {
    // A sponsor application awaiting review: a pending user with no profile.
    const applicant = accessUser({
      role: "sponsor",
      status: "pending",
      staffProfileId: null,
      sponsorProfileId: null,
    });
    const ineligible: AccessUser[] = [
      applicant,
      accessUser({ role: "admin", staffProfileId: null }),
      accessUser({ role: null, staffProfileId: null }),
      accessUser({ status: "inactive" }),
      accessUser({ role: "sponsor", staffProfileId: null, sponsorProfileId: null }),
      accessUser({ role: "family", staffProfileId: null, familyProfileId: null }),
      // Families are provisioned active; a pending one has no invitation.
      accessUser({
        role: "family",
        status: "pending",
        staffProfileId: null,
        familyProfileId: "family-1",
      }),
    ];

    for (const user of ineligible) {
      expect(expectedResetMode(user)).toBe("unsupported");
      expect(canResetAccess(user)).toBe(false);
    }
  });

  test("localizes the action, every mode explanation, and every outcome", () => {
    const keys = [
      "adminAccess.users.resetAccess",
      "adminAccess.dialogs.resetTitle",
      "adminAccess.dialogs.resetConfirm",
      "adminAccess.dialogs.reset.family_credential_setup",
      "adminAccess.dialogs.reset.reset_email_sent",
      "adminAccess.dialogs.reset.invitation_resent",
      "adminAccess.dialogs.reset.unsupported",
      "adminAccess.dialogs.reset.notSent",
      "adminAccess.messages.resetToCin",
      "adminAccess.messages.resetEmailSent",
      "adminAccess.messages.resetSimulated",
      "adminAccess.messages.invitationResent",
      "adminAccess.messages.resetError",
    ] as const;

    for (const language of LANGUAGES) {
      for (const key of keys) {
        const translated = getUiTranslation(language, key);
        expect(translated).not.toBe(key);
        expect(translated.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test("reaches the row menu in the table and in the card grid", async () => {
    const page = await Bun.file(
      new URL(
        "../src/features/AdminAccess/components/AdminUsersPage.tsx",
        import.meta.url,
      ),
    ).text();

    expect(page).toContain('t("adminAccess.users.resetAccess")');
    expect(page).toContain("disabled: !canResetAccess(user)");
    expect(page).toContain("<AdminAccessResetDialog user={user} />");
    // One action, not a staff/sponsor/family fork.
    expect(page.match(/AdminAccessResetDialog/g)).toHaveLength(2);
    // `menuButton` beside `renderCard` is what puts the same `menu.row` items
    // behind the card's action button, so the card grid is not view-only.
    expect(page).toContain("renderCard={AdminUserCard}");
    expect(page).toContain("menuButton");
    expect(page).toContain("menu={{");
  });

  test("never renders a credential, a token, or a link in the dialog", async () => {
    const dialogs = await Bun.file(
      new URL(
        "../src/features/AdminAccess/components/AdminAccessUserDialogs.tsx",
        import.meta.url,
      ),
    ).text();

    const resetDialog = dialogs.slice(dialogs.indexOf("AdminAccessResetDialog"));
    expect(resetDialog).not.toMatch(/type="password"|guardianCin|\bcin\b|token/i);
    // Reason and confirmation only.
    expect(resetDialog).toContain('name="reason"');
    expect(resetDialog).toContain('t("adminAccess.dialogs.resetConfirm")');
    // The mode explanation is chosen from the row, and the dialog awaits the
    // command before it closes.
    expect(resetDialog).toContain("adminAccess.dialogs.reset.${expected}");
    expect(resetDialog).toContain("await resetAccess.mutateAsync");
    expect(resetDialog).toContain("await pop()");
    // An undelivered message keeps the dialog open and says so.
    expect(resetDialog).toContain('result.delivery === "not_sent"');
    expect(resetDialog).toContain('tone="error"');
    expect(resetDialog).toContain('role="alert"');
    expect(resetDialog).toContain('t("adminAccess.dialogs.reset.notSent")');
  });

  test("sends only the target and a reason, and refreshes the account rows", async () => {
    const [api, hooks] = await Promise.all([
      Bun.file(new URL("../src/services/adminAccessApi.ts", import.meta.url)).text(),
      Bun.file(
        new URL("../src/features/AdminAccess/hooks/useAdminAccess.ts", import.meta.url),
      ).text(),
    ]);

    expect(api).toContain("/admin/access/users/${userId}/reset-access");
    expect(api).toContain("{ reason }");
    expect(hooks).toContain("mutationFn: resetAccessUser");
    expect(hooks).toContain("invalidate,");
    // The toast is derived from what the backend confirmed, and an undelivered
    // message gets no success toast at all.
    expect(hooks).toContain("successMessage: (result: AccessResetResult)");
    expect(hooks).toContain('result.delivery === "not_sent"');
    expect(hooks).toContain("adminAccess.messages.resetSimulated");
  });
});
