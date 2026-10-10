import { describe, expect, it, spyOn } from "bun:test";
import { type CachePluginConfig, CacheService } from "najm-cache";
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
  OrderController,
  Sponsor,
  Staff,
  StaffDeliveryOptions,
} from "../src/modules";
import {
  authConfig,
  hasRole,
  isAdmin,
  isChildImageViewer,
  isChildReader,
  isContributionReader,
  isDeliveryStaff,
  isFamily,
  isInGroup,
  isNotificationReader,
  isOperator,
  isOrderReader,
  isSponsor,
  isSponsorImageManager,
  isSponsorImageViewer,
  ROLES,
} from "../src/config/authConfig";
import { cacheConfig } from "../src/config/cacheConfig";
import { rateLimitConfig } from "../src/config/rateLimitConfig";
import { ROLE_SET, routeRoles } from "./routeRoles";

/** The config a plugin factory resolved for the current environment. */
const cacheOptions = () => cacheConfig().config as CachePluginConfig & { driver: string };
const rateOptions = () => rateLimitConfig().config as {
  trustedProxyHops: number;
  onUnresolvedClient: string;
  skip?: unknown;
};

function withAuthEnvironment(
  values: Partial<Record<"KAFIL_TRUSTED_PROXY_HOPS" | "NODE_ENV" | "REDIS_URL" | "NEXT_PHASE", string>>,
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
  it("defines the product roles with admin as the super role", () => {
    expect(ROLES).toEqual({
      ADMIN: "admin",
      OPERATOR: "operator",
      DELIVERY: "delivery",
      FAMILY: "family",
      SPONSOR: "sponsor",
    });
    expect(hasRole("admin", "OPERATOR")).toBe(true);
    expect(hasRole("admin", "DELIVERY")).toBe(true);
    expect(hasRole("admin", "FAMILY")).toBe(true);
    expect(hasRole("admin", "SPONSOR")).toBe(true);
    expect(hasRole("operator", "OPERATOR")).toBe(true);
    expect(hasRole("delivery", "DELIVERY")).toBe(true);
    expect(hasRole("delivery", "OPERATOR")).toBe(false);
    expect(hasRole("family", "FAMILY")).toBe(true);
    expect(hasRole("sponsor", "OPERATOR")).toBe(false);
    expect(isInGroup("family", ["ADMIN", "OPERATOR", "FAMILY"])).toBe(
      true,
    );
  });

  it("keeps generic public registration closed while applicants remain app-owned", () => {
    expect(authConfig().config).toMatchObject({
      appName: "Kafil",
      defaultRole: "sponsor",
      publicRegistration: false,
      registrationMode: "pending",
      requireVerifiedEmail: true,
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
        expect(cacheOptions()).toMatchObject({
          driver: "redis",
          required: true,
          redis: {
            keyPrefix: "kafil:",
            url: "rediss://:test-password@redis.internal:6379/0",
          },
        });
        expect(rateOptions()).toMatchObject({ trustedProxyHops: 1, onUnresolvedClient: "shared" });
        expect(rateOptions().skip).toBeUndefined();
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
        expect(cacheOptions()).toMatchObject({ driver: "memory", required: false });
        // A direct local route handler exposes no socket peer: requests without
        // a client address are not rate limited instead of sharing one bucket.
        expect(rateOptions()).toMatchObject({ trustedProxyHops: 0, onUnresolvedClient: "skip" });
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
          cacheConfig();
        } catch (error) {
          message = String(error);
        }
        expect(message).toContain("REDIS_URL");
        expect(message).not.toContain(secret);

        expect(() => rateLimitConfig()).toThrow("KAFIL_TRUSTED_PROXY_HOPS must be an integer from 0 to 8.");
      },
    );
  });

  it("rejects a missing or passwordless production Redis URL without echoing it", () => {
    withAuthEnvironment({ NODE_ENV: "production", REDIS_URL: undefined, NEXT_PHASE: undefined }, () => {
      expect(() => cacheConfig()).toThrow("REDIS_URL is required.");
    });
    withAuthEnvironment(
      { NODE_ENV: "production", REDIS_URL: "redis://redis.internal:6379/0", NEXT_PHASE: undefined },
      () => {
        let message = "";
        try {
          cacheConfig();
        } catch (error) {
          message = String(error);
        }
        expect(message).toContain("REDIS_URL must include a password.");
        expect(message).not.toContain("redis://");
      },
    );
  });

  it("uses an unrequired memory cache while next build evaluates the server", () => {
    withAuthEnvironment(
      { NODE_ENV: "production", REDIS_URL: undefined, NEXT_PHASE: "phase-production-build" },
      () => {
        expect(cacheOptions()).toMatchObject({ driver: "memory", required: false });
      },
    );
  });

  it("selects the installed Redis CacheService contract for production", () => {
    withAuthEnvironment(
      {
        NODE_ENV: "production",
        REDIS_URL: "redis://:test-password@redis.internal:6379/0",
        NEXT_PHASE: undefined,
      },
      () => {
        const config = cacheOptions();
        const cache = new CacheService({
          driver: (config.driver ?? "auto") as "auto",
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
    const warning = spyOn(console, "warn").mockImplementation(() => undefined);
    const environments = [
      { KAFIL_TRUSTED_PROXY_HOPS: undefined, NODE_ENV: "production", REDIS_URL: redis },
      { KAFIL_TRUSTED_PROXY_HOPS: undefined, NODE_ENV: "development", REDIS_URL: undefined },
      { KAFIL_TRUSTED_PROXY_HOPS: "", NODE_ENV: "production", REDIS_URL: redis },
      { KAFIL_TRUSTED_PROXY_HOPS: "0", NODE_ENV: "production", REDIS_URL: redis },
      { KAFIL_TRUSTED_PROXY_HOPS: "2", NODE_ENV: "production", REDIS_URL: redis },
    ];

    try {
      for (const environment of environments) {
        withAuthEnvironment(environment, () => {
          // Typed as `number`, not `number | undefined`: najm-rate reads an absent
          // hop count as "use the deprecated leftmost X-Forwarded-For value", so
          // widening this contract would silently restore the spoofable path.
          const hops: number = rateOptions().trustedProxyHops;
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
    } finally {
      warning.mockRestore();
    }
  });

  it("enables OAuth providers only with complete credentials and links existing accounts", () => {
    const originalClientId = process.env.GOOGLE_CLIENT_ID;
    const originalClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const originalGitHubClientId = process.env.GITHUB_CLIENT_ID;
    const originalGitHubClientSecret = process.env.GITHUB_CLIENT_SECRET;

    try {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
      delete process.env.GITHUB_CLIENT_ID;
      delete process.env.GITHUB_CLIENT_SECRET;
      expect(authConfig().config.oauth?.google).toBeUndefined();
      expect(authConfig().config.oauth?.github).toBeUndefined();

      process.env.GOOGLE_CLIENT_ID = "test-client-id";
      process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
      expect(authConfig().config.oauth).toMatchObject({
        google: {
          allowSignup: false,
          autoLinkVerifiedEmail: true,
        },
      });

      process.env.GITHUB_CLIENT_ID = "test-github-client-id";
      process.env.GITHUB_CLIENT_SECRET = "test-github-client-secret";
      expect(authConfig().config.oauth).toMatchObject({
        github: {
          allowSignup: false,
          autoLinkVerifiedEmail: true,
        },
      });
    } finally {
      if (originalClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
      else process.env.GOOGLE_CLIENT_ID = originalClientId;
      if (originalClientSecret === undefined) delete process.env.GOOGLE_CLIENT_SECRET;
      else process.env.GOOGLE_CLIENT_SECRET = originalClientSecret;
      if (originalGitHubClientId === undefined) delete process.env.GITHUB_CLIENT_ID;
      else process.env.GITHUB_CLIENT_ID = originalGitHubClientId;
      if (originalGitHubClientSecret === undefined) delete process.env.GITHUB_CLIENT_SECRET;
      else process.env.GITHUB_CLIENT_SECRET = originalGitHubClientSecret;
    }
  });

  it("gives every route guard exactly its roles, admin excluded only from delivery", () => {
    const guards = {
      isAdmin, isOperator, isDeliveryStaff, isFamily, isSponsor, isNotificationReader,
      isContributionReader, isChildReader, isOrderReader, isSponsorImageViewer,
      isSponsorImageManager, isChildImageViewer,
    };
    class Probe {}
    for (const [name, guard] of Object.entries(guards)) {
      (guard() as MethodDecorator)(Probe.prototype, name, Object.getOwnPropertyDescriptor(Probe.prototype, "constructor")!);
    }
    const roles = Object.fromEntries(Object.keys(guards).map((name) => [name, routeRoles(Probe, name)]));

    expect(roles).toEqual({
      isAdmin: ROLE_SET.admin,
      isOperator: ROLE_SET.operator,
      isDeliveryStaff: ROLE_SET.delivery,
      isFamily: ROLE_SET.family,
      isSponsor: ROLE_SET.sponsor,
      isNotificationReader: ROLE_SET.notificationReader,
      isContributionReader: ROLE_SET.contributionReader,
      isChildReader: ROLE_SET.childReader,
      isOrderReader: ROLE_SET.orderReader,
      isSponsorImageViewer: ROLE_SET.sponsorImage,
      isSponsorImageManager: ROLE_SET.sponsorImage,
      isChildImageViewer: ROLE_SET.childImageViewer,
    });
  });

  it("uses API resource names for policy permission resolution", () => {
    expect(Staff.name).toBe("staff");
    expect(StaffDeliveryOptions.name).toBe("staffDeliveryOptions");
    expect(Sponsor.name).toBe("sponsors");
    expect(Document.name).toBe("documents");
  });

  it("keeps each dashboard on its own role set", () => {
    const guardName = (method: string) => routeRoles(DashboardController, method);

    expect(guardName("getOperator")).toEqual(ROLE_SET.operator);
    expect(guardName("getDelivery")).toEqual(ROLE_SET.delivery);
    expect(guardName("getDeliveryFamilies")).toEqual(ROLE_SET.delivery);
    expect(guardName("getFamily")).toEqual(ROLE_SET.family);
    expect(guardName("getSponsor")).toEqual(ROLE_SET.sponsor);
  });

  it("limits delivery accounts to Staff-owned delivery commands", () => {
    const guardName = (method: string) => routeRoles(OrderController, method);

    expect(guardName("startOwnDelivery")).toEqual(ROLE_SET.delivery);
    expect(guardName("confirmOwnDelivery")).toEqual(ROLE_SET.delivery);
    expect(guardName("reportOwnDeliveryIssue")).toEqual(ROLE_SET.delivery);
    expect(guardName("getOwnDelivery")).toEqual(ROLE_SET.delivery);
    expect(guardName("recordOwnPurchase")).toEqual(ROLE_SET.delivery);
    expect(guardName("confirmDelivery")).toEqual(ROLE_SET.operator);

    // The Delivery role never widens into operator order management, generic
    // order reading, or purchase replacement.
    for (const operatorOnly of [
      "approve",
      "reject",
      "cancel",
      "recordPurchase",
      "replacePurchase",
      "assignDelivery",
      "reassignDelivery",
      "failDelivery",
    ]) {
      expect(guardName(operatorOnly)).toEqual(ROLE_SET.operator);
    }
    expect(guardName("list")).toEqual(ROLE_SET.orderReader);
    expect(guardName("get")).toEqual(ROLE_SET.orderReader);
  });

  it("keeps image routes on their explicit public and protected boundaries", () => {
    const guardName = (controller: object, method: string) => routeRoles(controller, method);

    expect(getGuardMetadata(CategoryImageController, "serve")).toEqual([]);
    expect(getGuardMetadata(ProductImageController, "serve")).toEqual([]);
    expect(guardName(CategoryImageController, "upload")).toEqual(ROLE_SET.operator);
    expect(guardName(CategoryImageController, "remove")).toEqual(ROLE_SET.operator);
    expect(guardName(ProductImageController, "upload")).toEqual(ROLE_SET.operator);
    expect(guardName(ProductImageController, "remove")).toEqual(ROLE_SET.operator);
    expect(guardName(SponsorImageController, "serve")).toEqual(ROLE_SET.sponsorImage);
    expect(guardName(ChildImageController, "serve")).toEqual(ROLE_SET.childImageViewer);
    expect(getGuardMetadata(FamilyImageController, "serve")).toEqual([]);
    expect(guardName(FamilyImageController, "upload")).toEqual(ROLE_SET.operator);
    expect(guardName(FamilyImageController, "remove")).toEqual(ROLE_SET.operator);
  });
});
