import { describe, expect, it } from "bun:test";
import { getGuardMetadata } from "najm-guard";

import {
  DashboardController,
  CategoryImageController,
  ProductImageController,
  SponsorImageController,
  ChildImageController,
  FamilyImageController,
  Document,
  Sponsor,
  Staff,
  StaffDeliveryOptions,
} from "../src/modules";
import {
  authConfig,
  hasRole,
  isInGroup,
  KafilRoleGuard,
  ROLES,
} from "../src/config/authConfig";

describe("Kafil auth definitions", () => {
  it("defines the four product roles with admin as the super role", () => {
    expect(ROLES).toEqual({
      ADMIN: "admin",
      OPERATOR: "operator",
      FAMILY: "family",
      SPONSOR: "sponsor",
    });
    expect(hasRole("admin", "OPERATOR")).toBe(true);
    expect(hasRole("admin", "FAMILY")).toBe(true);
    expect(hasRole("admin", "SPONSOR")).toBe(true);
    expect(hasRole("operator", "OPERATOR")).toBe(true);
    expect(hasRole("family", "FAMILY")).toBe(true);
    expect(hasRole("sponsor", "OPERATOR")).toBe(false);
    expect(isInGroup("family", ["ADMIN", "OPERATOR", "FAMILY"])).toBe(
      true,
    );
  });

  it("assigns public registration to the sponsor workflow", () => {
    expect(authConfig().config).toMatchObject({ defaultRole: "sponsor" });
  });

  it("enables Google only with complete credentials and links existing accounts", () => {
    const originalClientId = process.env.GOOGLE_CLIENT_ID;
    const originalClientSecret = process.env.GOOGLE_CLIENT_SECRET;

    try {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
      expect(authConfig().config.oauth?.google).toBeUndefined();

      process.env.GOOGLE_CLIENT_ID = "test-client-id";
      process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
      expect(authConfig().config.oauth).toMatchObject({
        google: {
          allowSignup: false,
          autoLinkVerifiedEmail: true,
        },
      });
    } finally {
      if (originalClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
      else process.env.GOOGLE_CLIENT_ID = originalClientId;
      if (originalClientSecret === undefined) delete process.env.GOOGLE_CLIENT_SECRET;
      else process.env.GOOGLE_CLIENT_SECRET = originalClientSecret;
    }
  });

  it("authorizes the canonical role from an already resolved user", async () => {
    const guard = new KafilRoleGuard({} as never);

    expect(
      await guard.canActivate(
        { allowedRoles: ["operator", "admin"] },
        { id: "operator-1", role: "operator", permissions: ["families:list"] },
      ),
    ).toEqual({
      user: {
        id: "operator-1",
        role: "operator",
        permissions: ["families:list"],
      },
      role: "operator",
      permissions: ["families:list"],
    });
    expect(
      await guard.canActivate(
        { allowedRoles: ["family", "admin"] },
        { id: "operator-1", role: "operator" },
      ),
    ).toBe(false);
  });

  it("validates a bearer token when auth context is not populated", async () => {
    const guard = new KafilRoleGuard({
      getUser: async () => ({
        id: "sponsor-1",
        role: "sponsor",
        permissions: ["contributions:create"],
      }),
    } as never);

    expect(
      await guard.canActivate(
        { allowedRoles: ["sponsor", "admin"] },
        undefined,
        { req: { header: () => "Bearer signed-token" } },
      ),
    ).toMatchObject({ role: "sponsor" });
  });

  it("re-resolves a bearer token when middleware publishes partial claims", async () => {
    const guard = new KafilRoleGuard({
      getUser: async () => ({ id: "operator-1", role: "operator" }),
    } as never);

    expect(
      await guard.canActivate(
        { allowedRoles: ["operator", "admin"] },
        { id: "operator-1" },
        { req: { header: () => "Bearer signed-token" } },
      ),
    ).toMatchObject({ role: "operator" });
  });

  it("uses API resource names for policy permission resolution", () => {
    expect(Staff.name).toBe("staff");
    expect(StaffDeliveryOptions.name).toBe("staffDeliveryOptions");
    expect(Sponsor.name).toBe("sponsors");
    expect(Document.name).toBe("documents");
  });

  it("keeps each dashboard role on isolated guard metadata", () => {
    const guardName = (method: string) =>
      getGuardMetadata(DashboardController, method)[0]?.guardClass.name;

    expect(guardName("getOperator")).toBe("OperatorRoleGuard");
    expect(guardName("getFamily")).toBe("FamilyRoleGuard");
    expect(guardName("getSponsor")).toBe("SponsorRoleGuard");
  });

  it("keeps image routes on their explicit public and protected boundaries", () => {
    const guardName = (controller: object, method: string) =>
      getGuardMetadata(controller as never, method)[0]?.guardClass.name;

    expect(guardName(CategoryImageController, "serve")).toBe(
      "CatalogImageViewerRoleGuard",
    );
    expect(guardName(ProductImageController, "serve")).toBe(
      "CatalogImageViewerRoleGuard",
    );
    expect(guardName(SponsorImageController, "serve")).toBe(
      "SponsorImageViewerRoleGuard",
    );
    expect(guardName(ChildImageController, "serve")).toBe(
      "ChildImageViewerRoleGuard",
    );
    expect(getGuardMetadata(FamilyImageController, "serve")).toEqual([]);
    expect(guardName(FamilyImageController, "upload")).toBe(
      "OperatorRoleGuard",
    );
    expect(guardName(FamilyImageController, "remove")).toBe(
      "OperatorRoleGuard",
    );
  });
});
