import { describe, expect, test } from "bun:test";

import {
  createMailTestGateway,
  parseMailTestGatewayConfig,
  type MailTestGatewayConfig,
} from "../scripts/mail-test-hub/gateway";

const kafilToken = "k".repeat(48);
const schoolToken = "s".repeat(48);

const config: MailTestGatewayConfig = {
  mailpitUrl: "http://mailpit:8025",
  mailpitAuthorization: "Basic upstream-only",
  apps: [
    {
      id: "kafil",
      token: kafilToken,
      recipientDomains: ["c4a-sponsor.test"],
    },
    {
      id: "school",
      token: schoolToken,
      recipientDomains: ["school-e2e.test"],
    },
  ],
};

const messages = new Map([
  [
    "kafil-message",
    {
      ID: "kafil-message",
      Created: "2026-08-30T12:00:00Z",
      To: [{ Address: "sponsor-a@c4a-sponsor.test", Name: "" }],
      Subject: "Verification code",
      Body: "123456",
    },
  ],
  [
    "school-message",
    {
      ID: "school-message",
      Created: "2026-08-30T12:00:01Z",
      To: [{ Address: "student@school-e2e.test", Name: "" }],
      Subject: "School verification",
      Body: "654321",
    },
  ],
]);

function bearer(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

function createUpstream() {
  const deleted: string[][] = [];
  const upstream = async (input: string, init?: RequestInit) => {
    const url = new URL(input);
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      config.mailpitAuthorization,
    );

    if (url.pathname === "/api/v1/info") {
      return Response.json({ Version: "test" });
    }
    if (url.pathname === "/api/v1/search") {
      return Response.json({
        total: messages.size,
        messages: [...messages.values()].map(({ ID, Created, Subject }) => ({
          ID,
          Created,
          Subject,
        })),
      });
    }
    if (url.pathname.startsWith("/api/v1/message/")) {
      const id = decodeURIComponent(url.pathname.slice("/api/v1/message/".length));
      const message = messages.get(id);
      return message
        ? Response.json(message)
        : Response.json({ error: "not found" }, { status: 404 });
    }
    if (url.pathname === "/api/v1/messages" && init?.method === "DELETE") {
      const payload = JSON.parse(String(init.body)) as { IDs: string[] };
      deleted.push(payload.IDs);
      return Response.json({ messages: payload.IDs.length });
    }
    return Response.json({ error: "unexpected upstream route" }, { status: 500 });
  };
  return { deleted, upstream };
}

describe("mail test hub gateway", () => {
  test("parses only strong, distinct, app-scoped tokens", () => {
    const parsed = parseMailTestGatewayConfig({
      MAIL_TEST_GATEWAY_MAILPIT_URL: "http://mailpit:8025",
      MAIL_TEST_GATEWAY_MAILPIT_USER: "gateway",
      MAIL_TEST_GATEWAY_MAILPIT_PASSWORD: "upstream-password",
      MAIL_TEST_GATEWAY_APPS_JSON: JSON.stringify(config.apps),
    });

    expect(parsed.apps.map((app) => app.id)).toEqual(["kafil", "school"]);
    expect(parsed.mailpitAuthorization).toStartWith("Basic ");
    expect(() =>
      parseMailTestGatewayConfig({
        MAIL_TEST_GATEWAY_MAILPIT_URL: "http://mailpit:8025",
        MAIL_TEST_GATEWAY_MAILPIT_USER: "gateway",
        MAIL_TEST_GATEWAY_MAILPIT_PASSWORD: "upstream-password",
        MAIL_TEST_GATEWAY_APPS_JSON: JSON.stringify([
          { id: "kafil", token: "weak", recipientDomains: ["c4a-sponsor.test"] },
        ]),
      }),
    ).toThrow("at least 32 characters");
    expect(() =>
      parseMailTestGatewayConfig({
        MAIL_TEST_GATEWAY_MAILPIT_URL: "http://mailpit:8025",
        MAIL_TEST_GATEWAY_MAILPIT_USER: "gateway",
        MAIL_TEST_GATEWAY_MAILPIT_PASSWORD: "upstream-password",
        MAIL_TEST_GATEWAY_APPS_JSON: JSON.stringify([
          config.apps[0],
          { ...config.apps[1], token: kafilToken },
        ]),
      }),
    ).toThrow("unique");
  });

  test("requires a bearer token and exposes only the narrow API", async () => {
    const { upstream } = createUpstream();
    const gateway = createMailTestGateway(config, upstream);

    const unauthenticated = await gateway(
      new Request("https://mail-api.example.test/api/v1/info"),
    );
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.headers.get("WWW-Authenticate")).toBe("Bearer");

    const authenticated = await gateway(
      new Request("https://mail-api.example.test/api/v1/info", {
        headers: bearer(kafilToken),
      }),
    );
    expect(authenticated.status).toBe(200);
    expect(await authenticated.json()).toEqual({
      service: "mail-test-gateway",
      app: "kafil",
    });

    const forbiddenRoute = await gateway(
      new Request("https://mail-api.example.test/api/v1/send", {
        method: "POST",
        headers: bearer(kafilToken),
      }),
    );
    expect(forbiddenRoute.status).toBe(404);
  });

  test("filters searches and blocks cross-app detail reads", async () => {
    const { upstream } = createUpstream();
    const gateway = createMailTestGateway(config, upstream);
    const query = encodeURIComponent(
      'to:sponsor-a@c4a-sponsor.test subject:"Verification code"',
    );

    const search = await gateway(
      new Request(`https://mail-api.example.test/api/v1/search?query=${query}`, {
        headers: bearer(kafilToken),
      }),
    );
    expect(search.status).toBe(200);
    const payload = (await search.json()) as { total: number; messages: unknown[] };
    expect(payload.total).toBe(1);
    expect(payload.messages).toHaveLength(1);

    const wrongDomain = await gateway(
      new Request(
        "https://mail-api.example.test/api/v1/search?query=to%3Aschool-e2e.test",
        { headers: bearer(kafilToken) },
      ),
    );
    expect(wrongDomain.status).toBe(403);

    const ownDetail = await gateway(
      new Request("https://mail-api.example.test/api/v1/message/kafil-message", {
        headers: bearer(kafilToken),
      }),
    );
    expect(ownDetail.status).toBe(200);

    const otherDetail = await gateway(
      new Request("https://mail-api.example.test/api/v1/message/school-message", {
        headers: bearer(kafilToken),
      }),
    );
    expect(otherDetail.status).toBe(404);
  });

  test("deletes only messages entirely owned by the authenticated app", async () => {
    const { deleted, upstream } = createUpstream();
    const gateway = createMailTestGateway(config, upstream);

    const ownDelete = await gateway(
      new Request("https://mail-api.example.test/api/v1/messages", {
        method: "DELETE",
        headers: {
          ...bearer(kafilToken),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ IDs: ["kafil-message"] }),
      }),
    );
    expect(ownDelete.status).toBe(200);
    expect(deleted).toEqual([["kafil-message"]]);

    const mixedDelete = await gateway(
      new Request("https://mail-api.example.test/api/v1/messages", {
        method: "DELETE",
        headers: {
          ...bearer(kafilToken),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ IDs: ["kafil-message", "school-message"] }),
      }),
    );
    expect(mixedDelete.status).toBe(404);
    expect(deleted).toEqual([["kafil-message"]]);
  });
});
