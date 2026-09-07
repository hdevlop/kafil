import { describe, expect, it } from "bun:test";
import { getMcpToolGroup, getMcpTools } from "najm-mcp";

import { AUTH_PERMISSIONS, AUTH_ROLE_PERMISSIONS } from "../src/config/authDefinitions";
import {
  CHANNEL_MATRIX,
  NOTIFICATION_TOPICS,
  buildTopicPayload,
  isSupportedNotificationTopic,
} from "../src/modules/notifications/notificationTopics";
import {
  notificationListQuery,
  notificationLocaleDto,
  pushSubscriptionDto,
} from "../src/modules/notifications/notificationDto";
import { NotificationController } from "../src/modules/notifications/notificationController";
import {
  NotificationLocaleResolver,
  normalizeLocale,
} from "../src/modules/notifications/localeResolver";
import { NotificationRecipientResolver } from "../src/modules/notifications/recipientResolver";
import {
  NotificationDispatcher,
  approvalLoginUrl,
  classifyEmailFailure,
} from "../src/modules/notifications/notificationDispatcher";
import {
  buildEmail,
  buildPushBody,
  escapeHtml,
} from "../src/modules/notifications/notificationTemplates";
import { sanitizeOutboxPayload } from "../src/modules/outbox/outboxService";
import { decodeCursor, encodeCursor } from "../src/modules/notifications/notificationRepository";
import {
  isValidVapidPublicKey,
  normalizeVapidSubject,
  vapidConfig,
} from "../src/modules/notifications/notificationConfig";
import {
  PushSender,
  classifyPushHttpStatus,
} from "../src/modules/notifications/pushSender";
import { createECDH } from "node:crypto";

describe("notifications DTO boundaries", () => {
  it("parses unread=false as false (not truthy)", () => {
    expect(notificationListQuery.parse({ unread: "false" }).unread).toBe(false);
    expect(notificationListQuery.parse({ unread: "true" }).unread).toBe(true);
    expect(notificationListQuery.parse({ unread: "0" }).unread).toBe(false);
    expect(notificationListQuery.parse({ unread: "1" }).unread).toBe(true);
    expect(notificationListQuery.parse({}).unread).toBeUndefined();
    expect(notificationListQuery.parse({ unread: false }).unread).toBe(false);
    expect(notificationListQuery.parse({ unread: true }).unread).toBe(true);
  });

  it("rejects unsupported locales and oversized topics", () => {
    expect(() => notificationLocaleDto.parse("de")).toThrow();
    expect(() =>
      notificationListQuery.parse({ topic: "x".repeat(121) }),
    ).toThrow();
  });

  it("bounds push endpoint, keys, and user-agent family", () => {
    const valid = {
      endpoint: "https://push.example.test/endpoint/abc123",
      p256dh: "dGVzdHB1YmxpY2tleQ",
      auth: "dGVzdGF1dGg",
    };
    expect(pushSubscriptionDto.parse(valid).endpoint).toContain("https://");
    expect(() =>
      pushSubscriptionDto.parse({ ...valid, endpoint: "not-a-url" }),
    ).toThrow();
    expect(() =>
      pushSubscriptionDto.parse({
        ...valid,
        endpoint: `https://push.example.test/${"x".repeat(2000)}`,
      }),
    ).toThrow();
    expect(() =>
      pushSubscriptionDto.parse({ ...valid, p256dh: "not base64!!" }),
    ).toThrow();
    expect(() =>
      pushSubscriptionDto.parse({
        ...valid,
        userAgentFamily: "x".repeat(81),
      }),
    ).toThrow();
  });

  it("round-trips cursor (created_at DESC, id DESC)", () => {
    const at = new Date("2026-01-01T00:00:00.000Z");
    const id = "00000000-0000-4000-8000-000000000001";
    const cursor = encodeCursor(at, id);
    expect(decodeCursor(cursor)).toEqual({
      createdAt: at.toISOString(),
      id,
    });
    expect(decodeCursor("not-a-cursor")).toBeNull();
  });
});

describe("notifications topic registry", () => {
  it("maps every emitted topic exhaustively with no wildcard", () => {
    expect(NOTIFICATION_TOPICS).toHaveLength(21);
    expect(new Set(NOTIFICATION_TOPICS).size).toBe(21);
    for (const topic of NOTIFICATION_TOPICS) {
      expect(CHANNEL_MATRIX[topic]).toBeDefined();
      expect(isSupportedNotificationTopic(topic)).toBe(true);
    }
    expect(isSupportedNotificationTopic("order.*")).toBe(false);
    expect(isSupportedNotificationTopic("unknown.topic")).toBe(false);
  });

  it("never emails families: applicant email only for applicant topics", () => {
    for (const topic of NOTIFICATION_TOPICS) {
      const matrix = CHANNEL_MATRIX[topic];
      if (topic.startsWith("applicant.")) {
        expect(matrix.applicantEmail).toBe(true);
        expect(matrix.sponsorEmail).toBe(false);
      } else {
        expect(matrix.applicantEmail).toBe(false);
      }
    }
    // High-value sponsor email topics keep family exclusion at the dispatcher
    // (kind check), while the matrix itself never grants a family-email flag.
    expect(CHANNEL_MATRIX["contribution.validated"]?.sponsorEmail).toBe(true);
    expect(CHANNEL_MATRIX["order.delivered"]?.sponsorEmail).toBe(true);
    expect(
      CHANNEL_MATRIX["family.fundingActivated"]?.sponsorEmail,
    ).toBe(true);
  });

  it("keeps topic payloads to the scalar allowlist", () => {
    const payload = buildTopicPayload("order.submitted", {
      orderNumber: "KFL-1",
      totalMinor: 5000,
      placementSource: "web",
      exactAddress: "must-not-pass",
      guardianCin: "must-not-pass",
      email: "must-not-pass",
    });
    expect(payload).toEqual({
      orderNumber: "KFL-1",
      totalMinor: 5000,
      placementSource: "web",
    });
    const applicant = buildTopicPayload("applicant.approved", {
      applicantId: "app-1",
      transition: "pending_review->approved",
      sponsorProfileId: "sp-1",
      authUserId: "must-not-pass",
      email: "must-not-pass",
    });
    expect(applicant).toEqual({
      applicantId: "app-1",
      transition: "pending_review->approved",
      sponsorProfileId: "sp-1",
    });
  });
});

describe("notifications privacy", () => {
  it("sanitizes outbox payloads before fan-out", () => {
    const sanitized = sanitizeOutboxPayload({
      amountMinor: 1200,
      orderNumber: "KFL-9",
      password: "secret",
      token: "secret",
      email: "someone@example.test",
      phone: "+212600000000",
      exactAddress: "123 Rue",
      guardianCin: "AB123",
      notes: "private",
      evidence: "protected",
      nested: { unsupported: true },
      ["x".repeat(81)]: "too-long-key",
      longValue: "y".repeat(1001),
    });
    expect(sanitized).toEqual({ amountMinor: 1200, orderNumber: "KFL-9" });
  });

  it("escapes email HTML and keeps plain-text parity", () => {
    const email = buildEmail(
      "order.delivered",
      "en",
      { orderNumber: "<KFL>&\"1\"" },
      null,
    );
    expect(email.html).toContain("&lt;KFL&gt;&amp;&quot;1&quot;");
    expect(email.html).not.toContain("<KFL>");
    expect(email.text).toContain("Order delivered");
    expect(email.subject.length).toBeGreaterThan(0);
    const arabic = buildEmail("applicant.rejected", "ar", {}, null);
    expect(arabic.html).toContain('dir="rtl"');
    const push = buildPushBody("contribution.validated", "fr");
    expect(push.title.length).toBeGreaterThan(0);
    expect(push.body.length).toBeGreaterThan(0);
    expect(escapeHtml("<a>&")).toBe("&lt;a&gt;&amp;");
  });
});

describe("notifications locale resolution", () => {
  it("normalizes only the four supported locales", () => {
    expect(normalizeLocale("en")).toBe("en");
    expect(normalizeLocale("FR")).toBe("fr");
    expect(normalizeLocale("ar-MA")).toBe("ar");
    expect(normalizeLocale("de")).toBeNull();
    expect(normalizeLocale(42)).toBeNull();
  });

  it("prefers applicant payload locale, then settings, then family Arabic", async () => {
    const settings = new Map<string, string>([["user-settings", "fr"]]);
    const repo = {
      findLocaleSetting: async (userId: string) =>
        settings.get(userId) ?? null,
      isFamilyRecipient: async (userId: string) => userId === "user-family",
    } as unknown as import("../src/modules/notifications/notificationRepository").NotificationRepository;
    const resolver = new NotificationLocaleResolver(repo);
    // Applicant payload locale wins even when settings exist.
    expect(
      await resolver.resolve("user-settings", "other", { locale: "ar" }),
    ).toBe("ar");
    // Settings win over the family default.
    expect(
      await resolver.resolve("user-settings", "family", {}),
    ).toBe("fr");
    // Family default is Arabic; everyone else falls back to English.
    expect(await resolver.resolve("user-family", "family", {})).toBe("ar");
    expect(await resolver.resolve("user-other", "other", {})).toBe("en");
    expect(await resolver.kindForRecipient("user-family")).toBe("family");
    expect(await resolver.kindForRecipient("user-other")).toBe("other");
  });
});

describe("notifications recipient resolution", () => {
  it("resolves exact sets with temporal assignment coverage", async () => {
    const repo = {
      findContributionParties: async () => ({
        sponsorUserId: "sponsor-1",
        familyUserId: "family-1",
      }),
      findOrderFamily: async () => ({
        familyProfileId: "family-profile-1",
        familyUserId: "family-1",
      }),
      findFamilyUser: async () => "family-1",
      findApplicantAuthUser: async () => "applicant-1",
      findSponsorUsersCoveringFamily: async () => ["sponsor-1", "sponsor-2"],
    } as unknown as import("../src/modules/notifications/notificationRepository").NotificationRepository;
    const resolver = new NotificationRecipientResolver(repo);
    const contribution = await resolver.resolve(
      "contribution.validated",
      "contribution",
      "c-1",
      new Date(),
    );
    expect(contribution.all.sort()).toEqual(["family-1", "sponsor-1"]);
    const order = await resolver.resolve(
      "order.delivered",
      "order",
      "o-1",
      new Date(),
    );
    expect(order.familyUserId).toBe("family-1");
    expect(order.sponsorUserIds).toEqual(["sponsor-1", "sponsor-2"]);
    const applicant = await resolver.resolve(
      "applicant.rejected",
      "applicant",
      "a-1",
      new Date(),
    );
    expect(applicant).toMatchObject({
      applicantUserId: "applicant-1",
      familyUserId: null,
    });
  });
});

describe("notifications authorization and MCP", () => {
  it("grants inbox capabilities to every role including admin", () => {
    const names = AUTH_PERMISSIONS.map((p) => p.name);
    expect(names).toContain("read:notifications");
    expect(names).toContain("update:notifications");
    for (const role of ["admin", "operator", "family", "sponsor"] as const) {
      expect(AUTH_ROLE_PERMISSIONS[role]).toContain("read:notifications");
      expect(AUTH_ROLE_PERMISSIONS[role]).toContain("update:notifications");
    }
  });

  it("exposes only safe inbox tools over MCP", () => {
    expect(getMcpToolGroup(NotificationController)).toBe("notifications");
    const tools = getMcpTools(NotificationController).map((t) => t.methodKey);
    // Phase A MCP surface: listMine, unreadCount, and confirmed markRead.
    // Bulk mark-all, subscriptions, VAPID config, and settings stay REST-only.
    expect(tools.sort()).toEqual(
      ["listMine", "markRead", "unreadCount"].sort(),
    );
    expect(tools).not.toContain("readAll");
    expect(tools).not.toContain("subscribe");
    expect(tools).not.toContain("unsubscribe");
    expect(tools).not.toContain("pushConfig");
    expect(tools).not.toContain("updateSettings");
  });
});

describe("notifications Phase C email ownership", () => {
  function dispatcherHarness(options: {
    topic: string;
    recipientsAll: string[];
    kinds: Record<string, "family" | "other">;
    emailEnabled: boolean;
    pushEnabled?: boolean;
  }) {
    const createdDeliveries: Array<{ channel: string; targetKey: string }> = [];
    const repo = {
      createNotifications: async (rows: Array<Record<string, unknown>>) =>
        rows.map((row, index) => ({
          id: `notif-${index}`,
          ...(row as object),
        })),
      findNotificationsByEvent: async () => [],
      createDeliveries: async (rows: Array<{ channel: string; targetKey: string }>) => {
        createdDeliveries.push(...rows);
        return rows;
      },
      listActiveSubscriptions: async () => [],
      markConsumerFailed: async () => undefined,
      markConsumerSent: async () => undefined,
      loadOutboxEvent: async () => ({
        id: "event-1",
        topic: options.topic,
        aggregateType: "applicant",
        aggregateId: "applicant-1",
        actorUserId: "actor-1",
        payload: { locale: "en" },
        createdAt: new Date(),
      }),
    } as unknown as import("../src/modules/notifications/notificationRepository").NotificationRepository;
    const recipients = {
      resolve: async () => ({
        familyUserId: null,
        sponsorUserIds: [],
        applicantUserId: "applicant-1",
        all: options.recipientsAll,
      }),
    } as unknown as NotificationRecipientResolver;
    const locales = {
      resolve: async () => "en" as const,
      kindForRecipient: async (userId: string) =>
        (options.kinds[userId] ?? "other") as "family" | "other",
    } as unknown as NotificationLocaleResolver;
    const dispatcher = new NotificationDispatcher(
      repo,
      recipients,
      locales,
      { send: async () => ({ success: true }) } as never,
      { send: async () => ({ result: "sent" }) } as never,
      { decryptField: (value: string) => value } as never,
    );
    return { dispatcher, createdDeliveries };
  }

  async function withEmailFlags(emailEnabled: boolean, run: () => Promise<void>) {
    const previous = {
      dispatch: process.env.NOTIFICATIONS_DISPATCH_ENABLED,
      email: process.env.NOTIFICATIONS_EMAIL_ENABLED,
      push: process.env.NOTIFICATIONS_PUSH_ENABLED,
    };
    process.env.NOTIFICATIONS_DISPATCH_ENABLED = "true";
    process.env.NOTIFICATIONS_EMAIL_ENABLED = emailEnabled ? "true" : "false";
    process.env.NOTIFICATIONS_PUSH_ENABLED = "false";
    try {
      await run();
    } finally {
      for (const [key, value] of [
        ["NOTIFICATIONS_DISPATCH_ENABLED", previous.dispatch],
        ["NOTIFICATIONS_EMAIL_ENABLED", previous.email],
        ["NOTIFICATIONS_PUSH_ENABLED", previous.push],
      ] as const) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  }

  it("creates exactly one dispatcher-owned applicant email job (single owner)", async () => {
    const { dispatcher, createdDeliveries } = dispatcherHarness({
      topic: "applicant.rejected",
      recipientsAll: ["applicant-1"],
      kinds: { "applicant-1": "other" },
      emailEnabled: true,
    });
    await withEmailFlags(true, () =>
      dispatcher.dispatchConsumerJob({ id: "job-1", outboxEventId: "event-1", attempts: 0 }),
    );
    // Phase C: the dispatcher is the single owner of applicant decision
    // email; the legacy ApplicantService direct sender was removed.
    const emails = createdDeliveries.filter((delivery) => delivery.channel === "email");
    expect(emails).toHaveLength(1);
    expect(emails[0]?.targetKey).toBe("user:applicant-1");
  });

  it("creates applicant approval email jobs through the same owner", async () => {
    const { dispatcher, createdDeliveries } = dispatcherHarness({
      topic: "applicant.approved",
      recipientsAll: ["applicant-1"],
      kinds: { "applicant-1": "other" },
      emailEnabled: true,
    });
    await withEmailFlags(true, () =>
      dispatcher.dispatchConsumerJob({ id: "job-1", outboxEventId: "event-1", attempts: 0 }),
    );
    expect(
      createdDeliveries.filter((delivery) => delivery.channel === "email"),
    ).toHaveLength(1);
  });

  it("never emails families even for high-value sponsor email topics", async () => {
    const { dispatcher, createdDeliveries } = dispatcherHarness({
      topic: "contribution.validated",
      recipientsAll: ["family-1"],
      kinds: { "family-1": "family" },
      emailEnabled: true,
    });
    await withEmailFlags(true, () =>
      dispatcher.dispatchConsumerJob({ id: "job-1", outboxEventId: "event-1", attempts: 0 }),
    );
    expect(
      createdDeliveries.filter((delivery) => delivery.channel === "email"),
    ).toHaveLength(0);
  });

  it("creates sponsor email for high-value topics and none when disabled", async () => {
    const sponsor = dispatcherHarness({
      topic: "contribution.validated",
      recipientsAll: ["sponsor-1"],
      kinds: { "sponsor-1": "other" },
      emailEnabled: true,
    });
    await withEmailFlags(true, () =>
      sponsor.dispatcher.dispatchConsumerJob({ id: "job-1", outboxEventId: "event-1", attempts: 0 }),
    );
    expect(
      sponsor.createdDeliveries.filter((delivery) => delivery.channel === "email"),
    ).toHaveLength(1);

    const lowValue = dispatcherHarness({
      topic: "contribution.submitted",
      recipientsAll: ["sponsor-1"],
      kinds: { "sponsor-1": "other" },
      emailEnabled: true,
    });
    await withEmailFlags(true, () =>
      lowValue.dispatcher.dispatchConsumerJob({ id: "job-1", outboxEventId: "event-1", attempts: 0 }),
    );
    expect(
      lowValue.createdDeliveries.filter((delivery) => delivery.channel === "email"),
    ).toHaveLength(0);

    const disabled = dispatcherHarness({
      topic: "applicant.rejected",
      recipientsAll: ["applicant-1"],
      kinds: { "applicant-1": "other" },
      emailEnabled: false,
    });
    await withEmailFlags(false, () =>
      disabled.dispatcher.dispatchConsumerJob({ id: "job-1", outboxEventId: "event-1", attempts: 0 }),
    );
    expect(
      disabled.createdDeliveries.filter((delivery) => delivery.channel === "email"),
    ).toHaveLength(0);
  });

  it("keeps email delivery target keys idempotent under replay", async () => {
    const first = dispatcherHarness({
      topic: "applicant.rejected",
      recipientsAll: ["applicant-1"],
      kinds: { "applicant-1": "other" },
      emailEnabled: true,
    });
    await withEmailFlags(true, () =>
      first.dispatcher.dispatchConsumerJob({ id: "job-1", outboxEventId: "event-1", attempts: 0 }),
    );
    const second = dispatcherHarness({
      topic: "applicant.rejected",
      recipientsAll: ["applicant-1"],
      kinds: { "applicant-1": "other" },
      emailEnabled: true,
    });
    await withEmailFlags(true, () =>
      second.dispatcher.dispatchConsumerJob({ id: "job-1", outboxEventId: "event-1", attempts: 0 }),
    );
    // Unique (notification_id, channel, target_key) makes replay converge on
    // the same deterministic target key instead of duplicating delivery.
    expect(first.createdDeliveries.map((row) => row.targetKey)).toEqual(
      second.createdDeliveries.map((row) => row.targetKey),
    );
  });
});

describe("notifications Phase C email delivery", () => {
  function deliveryHarness(options: {
    topic?: string;
    locale?: string;
    payload?: Record<string, string | number | boolean | null>;
    user?: { name?: string | null; email?: string | null; emailVerified?: boolean; status?: string };
    send?: (input: { to: string; subject: string; text: string; html: string }) => Promise<{ success: boolean; error?: string; response?: unknown }>;
  }) {
    const sent: Array<{ to: string; subject: string; text: string; html: string }> = [];
    const marks: Array<{ kind: string; code?: string }> = [];
    const topic = (options.topic ?? "applicant.rejected") as
      import("../src/modules/notifications/notificationTopics").NotificationTopic;
    const repo = {
      loadNotification: async () => ({
        id: "notif-1",
        recipientUserId: "recipient-1",
        locale: options.locale ?? "en",
        topic,
        payload: options.payload ?? {},
      }),
      findUserForDelivery: async () => ({
        id: "recipient-1",
        name:
          options.user && "name" in options.user
            ? (options.user.name as string | null)
            : "Applicant Fixture",
        email:
          options.user && "email" in options.user
            ? (options.user.email as string | null)
            : "applicant@example.test",
        emailVerified: options.user?.emailVerified ?? true,
        status: options.user?.status ?? "active",
      }),
      markDeliverySent: async () => {
        marks.push({ kind: "sent" });
      },
      markDeliverySkipped: async (_id: string, code: string) => {
        marks.push({ kind: "skipped", code });
      },
      markDeliveryFailed: async (_id: string, code: string) => {
        marks.push({ kind: "failed", code });
      },
      markDeliveryDead: async (_id: string, code: string) => {
        marks.push({ kind: "dead", code });
      },
    } as unknown as import("../src/modules/notifications/notificationRepository").NotificationRepository;
    const dispatcher = new NotificationDispatcher(
      repo,
      {} as never,
      {
        kindForRecipient: async () => "other" as const,
      } as unknown as NotificationLocaleResolver,
      {
        send: async (input: { to: string; subject: string; text: string; html: string }) => {
          sent.push(input);
          if (options.send) return options.send(input);
          return { success: true };
        },
      } as never,
      { send: async () => ({ result: "sent" }) } as never,
      { decryptField: (value: string) => value } as never,
    );
    return { dispatcher, sent, marks };
  }

  const deliveryJob = {
    id: "delivery-1",
    notificationId: "notif-1",
    channel: "email",
    targetKey: "user:recipient-1",
    pushSubscriptionId: null,
  };

  it("skips email with no verified address instead of failing the domain", async () => {
    for (const user of [
      { emailVerified: false, status: "active", email: "a@example.test" },
      { emailVerified: true, status: "active", email: null },
      { emailVerified: true, status: "inactive", email: "a@example.test" },
    ]) {
      const { dispatcher, sent, marks } = deliveryHarness({ topic: "order.delivered", user });
      await dispatcher.dispatchDeliveryJob(deliveryJob);
      expect(sent).toHaveLength(0);
      expect(marks).toEqual([{ kind: "skipped", code: "no_verified_email" }]);
    }
  });

  it("delivers applicant decisions to inactive identities (email remains the usable channel)", async () => {
    const { dispatcher, sent, marks } = deliveryHarness({
      topic: "applicant.rejected",
      user: { email: "applicant@example.test", emailVerified: true, status: "inactive" },
    });
    await dispatcher.dispatchDeliveryJob(deliveryJob);
    expect(sent).toHaveLength(1);
    expect(marks).toEqual([{ kind: "sent" }]);
  });

  it("retries transient provider errors and dead-letters permanent ones", async () => {
    const transient = deliveryHarness({
      send: async () => {
        throw new Error("provider timeout");
      },
    });
    await transient.dispatcher.dispatchDeliveryJob(deliveryJob);
    expect(transient.marks[0]?.kind).toBe("failed");

    const permanent = deliveryHarness({
      send: async () => ({ success: false, error: "invalid_address" }),
    });
    await permanent.dispatcher.dispatchDeliveryJob(deliveryJob);
    expect(permanent.marks[0]?.kind).toBe("dead");
  });

  it("retries real Resend transient shapes via the structured response, not the message", async () => {
    // The installed Resend adapter returns only data.message as `error`
    // ("Too many requests" carries no numeric status), so classification
    // must read `response.statusCode`/`response.name`.
    const rateLimited = deliveryHarness({
      send: async () => ({
        success: false,
        error: "Too many requests",
        response: {
          statusCode: 429,
          message: "Too many requests",
          name: "rate_limit_exceeded",
        },
      }),
    });
    await rateLimited.dispatcher.dispatchDeliveryJob(deliveryJob);
    expect(rateLimited.marks[0]?.kind).toBe("failed");
    expect(rateLimited.marks[0]?.code).toContain("429");

    const serverError = deliveryHarness({
      send: async () => ({
        success: false,
        error: "Internal server error",
        response: {
          statusCode: 500,
          message: "Internal server error",
          name: "internal_server_error",
        },
      }),
    });
    await serverError.dispatcher.dispatchDeliveryJob(deliveryJob);
    expect(serverError.marks[0]?.kind).toBe("failed");

    // Message-only fallbacks still retry when the text names a transient
    // condition, even without a structured status.
    for (const error of ["Too many requests", "Internal server error"]) {
      const fallback = deliveryHarness({
        send: async () => ({ success: false, error }),
      });
      await fallback.dispatcher.dispatchDeliveryJob(deliveryJob);
      expect(fallback.marks[0]?.kind).toBe("failed");
    }

    // A Resend 4xx validation failure is permanent and dead-letters.
    const invalid = deliveryHarness({
      send: async () => ({
        success: false,
        error: "Invalid `to` field",
        response: { statusCode: 400, message: "Invalid `to` field", name: "invalid_parameter" },
      }),
    });
    await invalid.dispatcher.dispatchDeliveryJob(deliveryJob);
    expect(invalid.marks[0]?.kind).toBe("dead");
  });

  it("classifies provider failures without leaking raw messages", () => {
    expect(classifyEmailFailure("provider timeout", undefined).transient).toBe(true);
    expect(
      classifyEmailFailure("Too many requests", {
        statusCode: 429,
        name: "rate_limit_exceeded",
      }).transient,
    ).toBe(true);
    expect(
      classifyEmailFailure("Internal server error", { statusCode: 500 }).transient,
    ).toBe(true);
    expect(
      classifyEmailFailure("Invalid `to` field", { statusCode: 400 }).transient,
    ).toBe(false);
    expect(classifyEmailFailure("invalid_address", undefined).transient).toBe(false);
    const coded = classifyEmailFailure("Too many requests", { statusCode: 429 });
    expect(coded.code.length).toBeLessThanOrEqual(120);
    expect(coded.code).not.toContain(" ");
  });

  it("greets the applicant by current name and links approvals to sign-in", async () => {
    const previousFrontendUrl = process.env.FRONTEND_URL;
    process.env.FRONTEND_URL = "https://kafil.example.test";
    try {
      expect(approvalLoginUrl()).toBe("https://kafil.example.test/login");

      const approved = deliveryHarness({
        topic: "applicant.approved",
        user: { name: "Salma Applicant", email: "applicant@example.test", emailVerified: true, status: "active" },
      });
      await approved.dispatcher.dispatchDeliveryJob(deliveryJob);
      expect(approved.marks).toEqual([{ kind: "sent" }]);
      expect(approved.sent[0]?.text).toContain("Salma Applicant,");
      expect(approved.sent[0]?.text).toContain("https://kafil.example.test/login");
      expect(approved.sent[0]?.html).toContain("https://kafil.example.test/login");
      expect(approved.sent[0]?.html).toContain("<a href=");

      // Rejections keep the personal greeting but carry no login link.
      const rejected = deliveryHarness({
        topic: "applicant.rejected",
        user: { name: "Salma Applicant", email: "applicant@example.test", emailVerified: true, status: "inactive" },
      });
      await rejected.dispatcher.dispatchDeliveryJob(deliveryJob);
      expect(rejected.marks).toEqual([{ kind: "sent" }]);
      expect(rejected.sent[0]?.text).toContain("Salma Applicant,");
      expect(rejected.sent[0]?.text).not.toContain("https://kafil.example.test/login");
      expect(rejected.sent[0]?.html).not.toContain("<a href=");
    } finally {
      if (previousFrontendUrl === undefined) delete process.env.FRONTEND_URL;
      else process.env.FRONTEND_URL = previousFrontendUrl;
    }
  });

  it("uses the snapshot locale and escapes payload values", async () => {
    const { dispatcher, sent, marks } = deliveryHarness({
      topic: "order.delivered",
      locale: "ar",
      payload: { orderNumber: "<KFL>&\"1\"" },
      user: { email: "sponsor@example.test", emailVerified: true, status: "active" },
    });
    await dispatcher.dispatchDeliveryJob(deliveryJob);
    expect(marks).toEqual([{ kind: "sent" }]);
    expect(sent[0]?.html).toContain('dir="rtl"');
    expect(sent[0]?.html).toContain("&lt;KFL&gt;&amp;&quot;1&quot;");
    expect(sent[0]?.html).not.toContain("<KFL>");
    // Snapshot locale drives the localized copy: Arabic title/body, with the
    // order detail line carried in both text and HTML forms under its
    // localized label.
    expect(sent[0]?.text).toContain("تم توصيل الطلب");
    expect(sent[0]?.text).toContain("الطلب: <KFL>");
  });

  it("localizes email detail labels for every supported locale", () => {
    expect(
      buildEmail("order.delivered", "en", { orderNumber: "KFL-1" }, null).text,
    ).toContain("Order: KFL-1");
    expect(
      buildEmail("order.delivered", "fr", { orderNumber: "KFL-1" }, null).text,
    ).toContain("Commande: KFL-1");
    expect(
      buildEmail("order.delivered", "ar", { orderNumber: "KFL-1" }, null).text,
    ).toContain("الطلب: KFL-1");
    expect(
      buildEmail("order.delivered", "es", { orderNumber: "KFL-1" }, null).text,
    ).toContain("Pedido: KFL-1");
    expect(
      buildEmail("contribution.validated", "fr", { amountMinor: 1200 }, null).text,
    ).toContain("Montant:");
    expect(
      buildEmail("family.fundingActivated", "ar", { fundedMinor: 5000, targetMinor: 10000 }, null)
        .text,
    ).toContain("المموّل:");
    expect(
      buildEmail("family.fundingActivated", "es", { fundedMinor: 5000, targetMinor: 10000 }, null)
        .text,
    ).toContain("Financiado:");
  });
});

describe("notifications Phase D VAPID config validation", () => {
  function genuineVapidPublicKey() {
    const ecdh = createECDH("prime256v1");
    ecdh.generateKeys();
    return ecdh.getPublicKey().toString("base64url");
  }

  it("normalizes bare contacts to mailto: and rejects non-URL subjects", () => {
    expect(normalizeVapidSubject("ops@example.com")).toBe("mailto:ops@example.com");
    expect(normalizeVapidSubject("  ops@example.com  ")).toBe("mailto:ops@example.com");
    expect(normalizeVapidSubject("mailto:ops@example.com")).toBe("mailto:ops@example.com");
    expect(normalizeVapidSubject("https://kafil.example.test/contact")).toBe(
      "https://kafil.example.test/contact",
    );
    expect(normalizeVapidSubject("http://kafil.example.test/contact")).toBeUndefined();
    expect(normalizeVapidSubject("not-an-address")).toBeUndefined();
    expect(normalizeVapidSubject("missing-at-sign.example")).toBeUndefined();
    expect(normalizeVapidSubject("")).toBeUndefined();
    expect(normalizeVapidSubject(undefined)).toBeUndefined();
    expect(normalizeVapidSubject("a@b.c" + "x".repeat(400))).toBeUndefined();
  });

  it("accepts only genuine uncompressed P-256 public keys", () => {
    const valid = genuineVapidPublicKey();
    expect(isValidVapidPublicKey(valid)).toBe(true);
    expect(isValidVapidPublicKey(`${valid}=`)).toBe(false);
    expect(isValidVapidPublicKey(`${valid.slice(0, -4)}!!!!`)).toBe(false);
    expect(isValidVapidPublicKey(valid.slice(0, -8))).toBe(false);
    const flipped = Buffer.from(valid, "base64url");
    flipped[0] = 0x03;
    expect(isValidVapidPublicKey(flipped.toString("base64url"))).toBe(false);
    expect(isValidVapidPublicKey("")).toBe(false);
    expect(isValidVapidPublicKey(undefined)).toBe(false);
    expect(isValidVapidPublicKey("dGVzdA")).toBe(false);
  });

  it("reports push enabled only for a fully valid VAPID configuration", () => {
    const previous = {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
      contact: process.env.VAPID_CONTACT_EMAIL,
    };
    try {
      const ecdh = createECDH("prime256v1");
      ecdh.generateKeys();
      process.env.VAPID_PUBLIC_KEY = ecdh.getPublicKey().toString("base64url");
      process.env.VAPID_PRIVATE_KEY = ecdh.getPrivateKey().toString("base64url");
      process.env.VAPID_CONTACT_EMAIL = "ops@example.com";
      expect(vapidConfig.configured).toBe(true);
      expect(vapidConfig.subject).toBe("mailto:ops@example.com");

      // A malformed key must fail closed: presence alone never enables push.
      process.env.VAPID_PUBLIC_KEY = "not-a-key";
      expect(vapidConfig.configured).toBe(false);

      process.env.VAPID_PUBLIC_KEY = ecdh.getPublicKey().toString("base64url");
      delete process.env.VAPID_CONTACT_EMAIL;
      expect(vapidConfig.configured).toBe(false);
    } finally {
      for (const [key, value] of [
        ["VAPID_PUBLIC_KEY", previous.publicKey],
        ["VAPID_PRIVATE_KEY", previous.privateKey],
        ["VAPID_CONTACT_EMAIL", previous.contact],
      ] as const) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  it("refuses to send when VAPID is not validly configured", async () => {
    const previous = {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
      contact: process.env.VAPID_CONTACT_EMAIL,
    };
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_CONTACT_EMAIL;
    try {
      const outcome = await new PushSender().send(
        { endpoint: "https://push.example.test/e", p256dh: "a", auth: "b" },
        { notificationId: "n", title: "t", body: "b" },
      );
      expect(outcome).toEqual({ result: "failed", code: "push_not_configured" });
    } finally {
      for (const [key, value] of [
        ["VAPID_PUBLIC_KEY", previous.publicKey],
        ["VAPID_PRIVATE_KEY", previous.privateKey],
        ["VAPID_CONTACT_EMAIL", previous.contact],
      ] as const) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
});

describe("notifications Phase D push error classification", () => {
  it("prunes gone subscriptions, retries transient faults, and dead-letters rejected credentials", () => {
    expect(classifyPushHttpStatus(404)).toBe("gone");
    expect(classifyPushHttpStatus(410)).toBe("gone");
    expect(classifyPushHttpStatus(429)).toBe("transient");
    expect(classifyPushHttpStatus(500)).toBe("transient");
    expect(classifyPushHttpStatus(502)).toBe("transient");
    expect(classifyPushHttpStatus(503)).toBe("transient");
    expect(classifyPushHttpStatus(400)).toBe("permanent");
    expect(classifyPushHttpStatus(401)).toBe("permanent");
    expect(classifyPushHttpStatus(403)).toBe("permanent");
    // Unknown statuses and non-HTTP failures stay transient so a new failure
    // mode retries bounded instead of silently dropping the delivery.
    expect(classifyPushHttpStatus(422)).toBe("transient");
    expect(classifyPushHttpStatus(200)).toBe("transient");
    expect(classifyPushHttpStatus(undefined)).toBe("transient");
    expect(classifyPushHttpStatus(null)).toBe("transient");
    expect(classifyPushHttpStatus("503")).toBe("transient");
    expect(classifyPushHttpStatus(Number.NaN)).toBe("transient");
  });
});

describe("notifications Phase D push fan-out", () => {
  function pushHarness(options: {
    topic: string;
    recipientsAll: string[];
    familyUserId?: string | null;
    applicantUserId?: string | null;
    kinds: Record<string, "family" | "other">;
    subscriptions: Record<string, Array<{ id: string }>>;
    pushEnabled: boolean;
  }) {
    const createdDeliveries: Array<{
      channel: string;
      targetKey: string;
      pushSubscriptionId: string | null;
    }> = [];
    const repo = {
      createNotifications: async (rows: Array<Record<string, unknown>>) =>
        rows.map((row, index) => ({
          id: `notif-${index}`,
          ...(row as object),
        })),
      findNotificationsByEvent: async () => [],
      createDeliveries: async (
        rows: Array<{ channel: string; targetKey: string; pushSubscriptionId: string | null }>,
      ) => {
        createdDeliveries.push(...rows);
        return rows;
      },
      listActiveSubscriptions: async (userId: string) =>
        options.subscriptions[userId] ?? [],
      markConsumerFailed: async () => undefined,
      markConsumerSent: async () => undefined,
      loadOutboxEvent: async () => ({
        id: "event-1",
        topic: options.topic,
        aggregateType: "push",
        aggregateId: "aggregate-1",
        actorUserId: "actor-1",
        payload: {},
        createdAt: new Date(),
      }),
    } as unknown as import("../src/modules/notifications/notificationRepository").NotificationRepository;
    const recipients = {
      resolve: async () => ({
        familyUserId: options.familyUserId ?? null,
        sponsorUserIds: [],
        applicantUserId: options.applicantUserId ?? null,
        all: options.recipientsAll,
      }),
    } as unknown as NotificationRecipientResolver;
    const locales = {
      resolve: async () => "en" as const,
      kindForRecipient: async (userId: string) =>
        (options.kinds[userId] ?? "other") as "family" | "other",
    } as unknown as NotificationLocaleResolver;
    const dispatcher = new NotificationDispatcher(
      repo,
      recipients,
      locales,
      { send: async () => ({ success: true }) } as never,
      { send: async () => ({ result: "sent" }) } as never,
      { decryptField: (value: string) => value } as never,
    );
    return { dispatcher, createdDeliveries };
  }

  async function withPushFlags(pushEnabled: boolean, run: () => Promise<void>) {
    const previous = {
      email: process.env.NOTIFICATIONS_EMAIL_ENABLED,
      push: process.env.NOTIFICATIONS_PUSH_ENABLED,
    };
    process.env.NOTIFICATIONS_EMAIL_ENABLED = "false";
    process.env.NOTIFICATIONS_PUSH_ENABLED = pushEnabled ? "true" : "false";
    try {
      await run();
    } finally {
      for (const [key, value] of [
        ["NOTIFICATIONS_EMAIL_ENABLED", previous.email],
        ["NOTIFICATIONS_PUSH_ENABLED", previous.push],
      ] as const) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  }

  function pushJobs(
    deliveries: Array<{ channel: string; targetKey: string; pushSubscriptionId: string | null }>,
  ) {
    return deliveries.filter((delivery) => delivery.channel === "push");
  }

  it("fans out family and sponsor push jobs only to subscribed recipients", async () => {
    const { dispatcher, createdDeliveries } = pushHarness({
      topic: "contribution.validated",
      recipientsAll: ["family-1", "sponsor-1", "sponsor-unsubscribed"],
      familyUserId: "family-1",
      kinds: { "family-1": "family", "sponsor-1": "other", "sponsor-unsubscribed": "other" },
      subscriptions: { "family-1": [{ id: "sub-family" }], "sponsor-1": [{ id: "sub-a" }, { id: "sub-b" }] },
      pushEnabled: true,
    });
    await withPushFlags(true, () =>
      dispatcher.dispatchConsumerJob({ id: "job-1", outboxEventId: "event-1", attempts: 0 }),
    );
    const jobs = pushJobs(createdDeliveries);
    expect(jobs).toHaveLength(3);
    expect(jobs.map((job) => job.targetKey).sort()).toEqual(
      ["sub:sub-a", "sub:sub-b", "sub:sub-family"].sort(),
    );
    expect(jobs.map((job) => job.pushSubscriptionId).sort()).toEqual(
      ["sub-a", "sub-b", "sub-family"].sort(),
    );
  });

  it("creates no push jobs for low-value topics, missing subscriptions, or a disabled channel", async () => {
    const lowValue = pushHarness({
      topic: "contribution.submitted",
      recipientsAll: ["sponsor-1"],
      kinds: { "sponsor-1": "other" },
      subscriptions: { "sponsor-1": [{ id: "sub-a" }] },
      pushEnabled: true,
    });
    await withPushFlags(true, () =>
      lowValue.dispatcher.dispatchConsumerJob({ id: "job-1", outboxEventId: "event-1", attempts: 0 }),
    );
    expect(pushJobs(lowValue.createdDeliveries)).toHaveLength(0);

    const unsubscribed = pushHarness({
      topic: "order.delivered",
      recipientsAll: ["family-1"],
      familyUserId: "family-1",
      kinds: { "family-1": "family" },
      subscriptions: {},
      pushEnabled: true,
    });
    await withPushFlags(true, () =>
      unsubscribed.dispatcher.dispatchConsumerJob({ id: "job-1", outboxEventId: "event-1", attempts: 0 }),
    );
    expect(pushJobs(unsubscribed.createdDeliveries)).toHaveLength(0);

    const disabled = pushHarness({
      topic: "order.delivered",
      recipientsAll: ["family-1"],
      familyUserId: "family-1",
      kinds: { "family-1": "family" },
      subscriptions: { "family-1": [{ id: "sub-family" }] },
      pushEnabled: false,
    });
    await withPushFlags(false, () =>
      disabled.dispatcher.dispatchConsumerJob({ id: "job-1", outboxEventId: "event-1", attempts: 0 }),
    );
    expect(pushJobs(disabled.createdDeliveries)).toHaveLength(0);
  });

  it("sends applicant approval push only to subscribed non-family recipients", async () => {
    const subscribed = pushHarness({
      topic: "applicant.approved",
      recipientsAll: ["applicant-1"],
      applicantUserId: "applicant-1",
      kinds: { "applicant-1": "other" },
      subscriptions: { "applicant-1": [{ id: "sub-applicant" }] },
      pushEnabled: true,
    });
    await withPushFlags(true, () =>
      subscribed.dispatcher.dispatchConsumerJob({ id: "job-1", outboxEventId: "event-1", attempts: 0 }),
    );
    expect(pushJobs(subscribed.createdDeliveries).map((job) => job.targetKey)).toEqual([
      "sub:sub-applicant",
    ]);

    // applicant.rejected carries no push matrix entry, and a family-kind
    // applicant never receives push even on an approval topic.
    const rejected = pushHarness({
      topic: "applicant.rejected",
      recipientsAll: ["applicant-1"],
      applicantUserId: "applicant-1",
      kinds: { "applicant-1": "other" },
      subscriptions: { "applicant-1": [{ id: "sub-applicant" }] },
      pushEnabled: true,
    });
    await withPushFlags(true, () =>
      rejected.dispatcher.dispatchConsumerJob({ id: "job-1", outboxEventId: "event-1", attempts: 0 }),
    );
    expect(pushJobs(rejected.createdDeliveries)).toHaveLength(0);

    const familyKind = pushHarness({
      topic: "applicant.approved",
      recipientsAll: ["applicant-1"],
      applicantUserId: "applicant-1",
      kinds: { "applicant-1": "family" },
      subscriptions: { "applicant-1": [{ id: "sub-applicant" }] },
      pushEnabled: true,
    });
    await withPushFlags(true, () =>
      familyKind.dispatcher.dispatchConsumerJob({ id: "job-1", outboxEventId: "event-1", attempts: 0 }),
    );
    expect(pushJobs(familyKind.createdDeliveries)).toHaveLength(0);
  });
});

describe("notifications Phase D push delivery", () => {
  type PushOutcome =
    | { result: "sent" }
    | { result: "gone" }
    | { result: "transient"; code: string }
    | { result: "failed"; code: string };

  function pushDeliveryHarness(options: {
    topic?: string;
    locale?: string;
    subscription?: {
      id: string;
      userId: string;
      disabledAt: Date | null;
    } | null;
    decrypt?: (ciphertext: string) => string;
    outcome?: PushOutcome;
  }) {
    const sent: Array<{
      target: { endpoint: string; p256dh: string; auth: string };
      payload: { notificationId: string; title: string; body: string };
    }> = [];
    const marks: Array<{ kind: string; code?: string }> = [];
    const subscriptionMarks: Array<{ kind: string }> = [];
    const topic = (options.topic ?? "order.delivered") as
      import("../src/modules/notifications/notificationTopics").NotificationTopic;
    const repo = {
      loadNotification: async () => ({
        id: "notif-1",
        recipientUserId: "recipient-1",
        locale: options.locale ?? "en",
        topic,
        payload: {},
      }),
      findSubscription: async () => options.subscription ?? null,
      markSubscriptionSuccess: async () => {
        subscriptionMarks.push({ kind: "success" });
      },
      markSubscriptionFailure: async () => {
        subscriptionMarks.push({ kind: "failure" });
      },
      disableSubscription: async () => {
        subscriptionMarks.push({ kind: "disabled" });
      },
      markDeliverySent: async () => {
        marks.push({ kind: "sent" });
      },
      markDeliverySkipped: async (_id: string, code: string) => {
        marks.push({ kind: "skipped", code });
      },
      markDeliveryFailed: async (_id: string, code: string) => {
        marks.push({ kind: "failed", code });
      },
      markDeliveryDead: async (_id: string, code: string) => {
        marks.push({ kind: "dead", code });
      },
    } as unknown as import("../src/modules/notifications/notificationRepository").NotificationRepository;
    const dispatcher = new NotificationDispatcher(
      repo,
      {} as never,
      {
        kindForRecipient: async () => "other" as const,
      } as unknown as NotificationLocaleResolver,
      { send: async () => ({ success: true }) } as never,
      {
        send: async (
          target: { endpoint: string; p256dh: string; auth: string },
          payload: { notificationId: string; title: string; body: string },
        ) => {
          sent.push({ target, payload });
          return options.outcome ?? { result: "sent" };
        },
      } as never,
      {
        decryptField: options.decrypt ?? ((value: string) => value),
      } as never,
    );
    return { dispatcher, sent, marks, subscriptionMarks };
  }

  const pushJob = {
    id: "delivery-1",
    notificationId: "notif-1",
    channel: "push",
    targetKey: "sub:sub-1",
    pushSubscriptionId: "sub-1",
  };
  const activeSubscription = { id: "sub-1", userId: "recipient-1", disabledAt: null };

  it("sends a bounded payload and stamps subscription success", async () => {
    const { dispatcher, sent, marks, subscriptionMarks } = pushDeliveryHarness({
      subscription: activeSubscription,
      outcome: { result: "sent" },
    });
    await dispatcher.dispatchDeliveryJob(pushJob);
    expect(marks).toEqual([{ kind: "sent" }]);
    expect(subscriptionMarks).toEqual([{ kind: "success" }]);
    expect(sent).toHaveLength(1);
    expect(Object.keys(sent[0]?.payload ?? {}).sort()).toEqual(
      ["body", "notificationId", "title"].sort(),
    );
    expect(sent[0]?.payload.notificationId).toBe("notif-1");
  });

  it("prunes gone subscriptions and completes the target as skipped", async () => {
    const { dispatcher, sent, marks, subscriptionMarks } = pushDeliveryHarness({
      subscription: activeSubscription,
      outcome: { result: "gone" },
    });
    await dispatcher.dispatchDeliveryJob(pushJob);
    expect(sent).toHaveLength(1);
    expect(subscriptionMarks).toEqual([{ kind: "disabled" }]);
    expect(marks).toEqual([{ kind: "skipped", code: "push_gone" }]);
  });

  it("retries transient faults and dead-letters rejected credentials", async () => {
    const transient = pushDeliveryHarness({
      subscription: activeSubscription,
      outcome: { result: "transient", code: "push_503" },
    });
    await transient.dispatcher.dispatchDeliveryJob(pushJob);
    expect(transient.marks).toEqual([{ kind: "failed", code: "push_503" }]);
    expect(transient.subscriptionMarks).toEqual([{ kind: "failure" }]);

    const rejected = pushDeliveryHarness({
      subscription: activeSubscription,
      outcome: { result: "failed", code: "push_401" },
    });
    await rejected.dispatcher.dispatchDeliveryJob(pushJob);
    expect(rejected.marks).toEqual([{ kind: "dead", code: "push_401" }]);
    expect(rejected.subscriptionMarks).toEqual([]);
  });

  it("skips missing, disabled, or transferred subscriptions without calling the provider", async () => {
    for (const subscription of [
      null,
      { id: "sub-1", userId: "recipient-1", disabledAt: new Date() },
      { id: "sub-1", userId: "another-user", disabledAt: null },
    ]) {
      const { dispatcher, sent, marks } = pushDeliveryHarness({ subscription });
      await dispatcher.dispatchDeliveryJob(pushJob);
      expect(sent).toHaveLength(0);
      expect(marks).toEqual([{ kind: "skipped", code: "no_subscription" }]);
    }
    const missingTarget = pushDeliveryHarness({ subscription: activeSubscription });
    await missingTarget.dispatcher.dispatchDeliveryJob({ ...pushJob, pushSubscriptionId: null });
    expect(missingTarget.sent).toHaveLength(0);
    expect(missingTarget.marks).toEqual([{ kind: "skipped", code: "no_subscription" }]);
  });

  it("dead-letters undecryptable subscriptions without leaking key material", async () => {
    const { dispatcher, sent, marks } = pushDeliveryHarness({
      subscription: activeSubscription,
      decrypt: () => {
        throw new Error("decrypt failed");
      },
    });
    await dispatcher.dispatchDeliveryJob(pushJob);
    expect(sent).toHaveLength(0);
    expect(marks).toEqual([{ kind: "dead", code: "push_decrypt_failed" }]);
  });
});
