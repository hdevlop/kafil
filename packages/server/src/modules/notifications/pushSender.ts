import { Service } from "najm-core";

import { vapidConfig } from "./notificationConfig";

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export type PushSendOutcome =
  | { result: "sent" }
  | { result: "gone" }
  | { result: "transient"; code: string }
  | { result: "failed"; code: string };

/**
 * Pure classification of a `web-push` failure status. Gone subscriptions
 * prune; rate-limit and server errors retry with bounded backoff; rejected
 * credentials and malformed requests dead-letter immediately instead of
 * burning all six attempts. Unknown statuses and non-HTTP errors stay
 * transient so a new failure mode retries bounded rather than dropping.
 */
export function classifyPushHttpStatus(statusCode: unknown): "gone" | "transient" | "permanent" {
  if (statusCode === 404 || statusCode === 410) return "gone";
  if (statusCode === 429) return "transient";
  if (typeof statusCode === "number" && Number.isFinite(statusCode)) {
    if (statusCode >= 500 && statusCode < 600) return "transient";
    if (statusCode === 400 || statusCode === 401 || statusCode === 403) {
      return "permanent";
    }
  }
  return "transient";
}

function sanitizeCode(value: unknown) {
  const raw = value instanceof Error ? value.message : String(value ?? "push_failed");
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120) || "push_failed";
}

@Service()
export class PushSender {
  private configured = false;

  private async load() {
    if (!vapidConfig.configured) return null;
    try {
      const mod = await import("web-push");
      const webpush = (mod as { default?: unknown }).default ?? mod;
      const api = webpush as {
        setVapidDetails: (contact: string, publicKey: string, privateKey: string) => void;
        sendNotification: (
          subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
          payload: string,
          options?: { TTL?: number },
        ) => Promise<unknown>;
      };
      api.setVapidDetails(
        vapidConfig.subject!,
        vapidConfig.publicKey!,
        vapidConfig.privateKey!,
      );
      this.configured = true;
      return api;
    } catch {
      return null;
    }
  }

  async send(
    target: PushTarget,
    payload: { notificationId: string; title: string; body: string },
  ): Promise<PushSendOutcome> {
    const api = await this.load();
    if (!api) return { result: "failed", code: "push_not_configured" };
    const bounded = JSON.stringify({
      notificationId: payload.notificationId.slice(0, 100),
      title: payload.title.slice(0, 120),
      body: payload.body.slice(0, 300),
    });
    try {
      await api.sendNotification(
        { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
        bounded,
        { TTL: 24 * 3_600 },
      );
      return { result: "sent" };
    } catch (error) {
      const status = (error as { statusCode?: unknown })?.statusCode;
      const verdict = classifyPushHttpStatus(status);
      if (verdict === "gone") return { result: "gone" };
      if (verdict === "permanent") {
        return {
          result: "failed",
          code: typeof status === "number" ? `push_${status}` : sanitizeCode(error),
        };
      }
      if (typeof status === "number" && (status === 429 || (status >= 500 && status < 600))) {
        return { result: "transient", code: `push_${status}` };
      }
      return { result: "transient", code: sanitizeCode(error) };
    }
  }
}
