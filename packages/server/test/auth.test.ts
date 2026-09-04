import { describe, expect, it } from "bun:test";
import { cache as cachePlugin, type CachePluginConfig, CacheService } from "najm-cache";
import { Server } from "najm-core";
import { getGuardMetadata } from "najm-guard";
import { resolveClientAddress } from "najm-rate";

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
  authInfrastructureConfig,
  hasRole,
  isInGroup,
  KafilRoleGuard,
  ROLES,
} from "../src/config/authConfig";
import { envConfig } from "../src/config/envConfig";

function withAuthEnvironment(
  values: Partial<Record<"KAFIL_TRUSTED_PROXY_HOPS" | "NODE_ENV" | "REDIS_URL", string>>,
  run: () => void,
) {
  const names = Object.keys(values) as (keyof typeof values)[];
  const originals = new Map(names.map((name) => [name, process.env[name]]));

  try {
    for (const name of names) {
      const value = values[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    run();
  } finally {
    for (const name of names) {
      const value = originals.get(name);
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

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

  it("keeps generic public registration closed while applicants remain app-owned", () => {
    expect(authConfig().config).toMatchObject({
      defaultRole: "sponsor",
      publicRegistration: false,
      registrationMode: "pending",
    });
  });

  it("requires Redis and the exact proxy topology in production", () => {
    withAuthEnvironment(
      {
        KAFIL_TRUSTED_PROXY_HOPS: undefined,
        NODE_ENV: "production",
        REDIS_URL: "rediss://:test-password@redis.internal:6379/0",
      },
      () => {
        expect(authInfrastructureConfig()).toMatchObject({
          cache: {
            driver: "redis",
            required: true,
            redis: {
              keyPrefix: "kafil:",
              url: "rediss://:test-password@redis.internal:6379/0",
            },
          },
          rateLimit: { trustedProxyHops: 1 },
        });
      },
    );
  });

  it("allows explicit local memory while trusting no forwarded address", () => {
    withAuthEnvironment(
      {
        KAFIL_TRUSTED_PROXY_HOPS: undefined,
        NODE_ENV: "development",
        REDIS_URL: undefined,
      },
      () => {
        expect(authInfrastructureConfig()).toMatchObject({
          cache: { driver: "memory", required: false },
          rateLimit: { trustedProxyHops: 0 },
        });
      },
    );
  });

  it("rejects malformed Redis URLs and bounded proxy-hop violations without echoing values", () => {
    const secret = "redis-password-must-not-leak";
    withAuthEnvironment(
      {
        KAFIL_TRUSTED_PROXY_HOPS: "9",
        NODE_ENV: "production",
        REDIS_URL: `https://:${secret}@redis.internal/0`,
      },
      () => {
        let message = "";
        try {
          void envConfig.auth.cache;
        } catch (error) {
          message = String(error);
        }
        expect(message).toContain("REDIS_URL");
        expect(message).not.toContain(secret);

        process.env.REDIS_URL = "redis://redis.internal:6379/0";
        expect(() => envConfig.auth.trustedProxyHops).toThrow("from 0 to 8");
      },
    );
  });

  it("rejects a missing production Redis URL during server initialization", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalRedisUrl = process.env.REDIS_URL;

    try {
      process.env.NODE_ENV = "production";
      delete process.env.REDIS_URL;
      const isolated = new Server({ isolated: true }).use(
        cachePlugin(authInfrastructureConfig().cache),
      );

      let message = "";
      try {
        await isolated.init();
      } catch (error) {
        message = String(error);
      }
      expect(message).toContain("requires a Redis URL");
      expect(message).not.toContain("redis://");
    } finally {
      if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = originalNodeEnv;
      if (originalRedisUrl === undefined) delete process.env.REDIS_URL;
      else process.env.REDIS_URL = originalRedisUrl;
    }
  });

  it("selects the installed Redis CacheService contract for production", () => {
    withAuthEnvironment(
      {
        NODE_ENV: "production",
        REDIS_URL: "redis://:test-password@redis.internal:6379/0",
      },
      () => {
        const config = authInfrastructureConfig().cache as CachePluginConfig;
        const cache = new CacheService({
          driver: config.driver ?? "auto",
          memory: config.memory ?? {},
          redis: config.redis,
          required: config.required ?? false,
        });
        expect(cache.type).toBe("redis");
      },
    );
  });

  it("keeps spoofed left-side addresses in one bucket and separates trusted clients", () => {
    const address = (forwarded: string) =>
      resolveClientAddress({ "x-forwarded-for": forwarded }, 1);

    const firstBucket = address("198.51.100.10, 203.0.113.7");
    const rotatedSpoofBucket = address("192.0.2.44, 203.0.113.7");
    const otherClientBucket = address("198.51.100.10, 203.0.113.8");

    expect(rotatedSpoofBucket).toBe(firstBucket);
    expect(otherClientBucket).not.toBe(firstBucket);
  });

  it("never leaves the trusted-hop contract undeclared", () => {
    const redis = "redis://:test-password@redis.internal:6379/0";
    const environments = [
      { KAFIL_TRUSTED_PROXY_HOPS: undefined, NODE_ENV: "production", REDIS_URL: redis },
      { KAFIL_TRUSTED_PROXY_HOPS: undefined, NODE_ENV: "development", REDIS_URL: undefined },
      { KAFIL_TRUSTED_PROXY_HOPS: "", NODE_ENV: "production", REDIS_URL: redis },
      { KAFIL_TRUSTED_PROXY_HOPS: "0", NODE_ENV: "production", REDIS_URL: redis },
      { KAFIL_TRUSTED_PROXY_HOPS: "2", NODE_ENV: "production", REDIS_URL: redis },
    ];

    for (const environment of environments) {
      withAuthEnvironment(environment, () => {
        // Typed as `number`, not `number | undefined`: najm-rate reads an absent
        // hop count as "use the deprecated leftmost X-Forwarded-For value", so
        // widening this contract would silently restore the spoofable path.
        const hops: number = authInfrastructureConfig().rateLimit.trustedProxyHops;
        expect(Number.isInteger(hops)).toBe(true);

        // A chain of exactly the declared length is what the real topology
        // produces; prepending an attacker-chosen entry must not move the
        // boundary, whatever hop count this environment resolved to.
        //
        // No peer address is supplied here. The runtime's peer comes from the
        // connection, which this unit cannot fabricate without asserting a
        // contract it does not control, so at zero hops both chains resolve to
        // the fail-closed token and share one bucket. najm-rate covers the
        // peer-backed behaviour through its own middleware.
        const declared = Array.from(
          { length: hops },
          (_, index) => `203.0.113.${index + 1}`,
        ).join(", ");
        const address = (forwarded: string) =>
          resolveClientAddress({ "x-forwarded-for": forwarded }, hops);

        expect(address(`192.0.2.44, ${declared}`)).toBe(address(declared));
        expect(address(`192.0.2.44, ${declared}`)).not.toBe("192.0.2.44");
      });
    }
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

    expect(getGuardMetadata(CategoryImageController, "serve")).toEqual([]);
    expect(getGuardMetadata(ProductImageController, "serve")).toEqual([]);
    expect(guardName(CategoryImageController, "upload")).toBe("OperatorRoleGuard");
    expect(guardName(CategoryImageController, "remove")).toBe("OperatorRoleGuard");
    expect(guardName(ProductImageController, "upload")).toBe("OperatorRoleGuard");
    expect(guardName(ProductImageController, "remove")).toBe("OperatorRoleGuard");
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
