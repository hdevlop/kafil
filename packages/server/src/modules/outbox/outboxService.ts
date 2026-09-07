import { Service } from "najm-core";

import { OutboxRepository } from "./outboxRepository";

export const NOTIFICATIONS_CONSUMER_KEY = "notifications-v1" as const;

export interface EnqueueOutboxEventInput {
  topic: string;
  aggregateType: string;
  aggregateId: string;
  payload?: Record<string, unknown>;
  actorUserId?: string | null;
}

@Service()
export class OutboxService {
  constructor(private readonly events: OutboxRepository) {}

  async enqueue(input: EnqueueOutboxEventInput) {
    const event = await this.events.create({
      topic: input.topic.slice(0, 120),
      aggregateType: input.aggregateType.slice(0, 80),
      aggregateId: input.aggregateId.slice(0, 500),
      actorUserId: input.actorUserId ?? null,
      payload: sanitizeOutboxPayload(input.payload ?? {}),
    });
    // Same surrounding transaction as the domain mutation: when the caller
    // runs inside @Transaction, both rows commit or roll back together.
    // Historical rows have no consumer job and never backfill.
    await this.events.createConsumerJob({
      outboxEventId: event.id,
      consumerKey: NOTIFICATIONS_CONSUMER_KEY,
    });
    return event;
  }


  markDelivered(id: string, processedAt = new Date()) {
    return this.events.markDelivered(id, processedAt);
  }

  markDeliveryFailed(id: string, error: unknown, attemptedAt = new Date()) {
    const message = error instanceof Error ? error.message : String(error);
    return this.events.markDeliveryFailed(
      id,
      message,
      attemptedAt,
      new Date(attemptedAt.getTime() + 5 * 60_000),
    );
  }
}

/**
 * Shared sanitizer contract for every durable outbox payload.
 *
 * Drops keys that indicate secrets, credentials, contact data, or protected
 * household fields, keeps only JSON scalars, and bounds key/value sizes so no
 * caller can smuggle an unbounded blob into the inbox, email, push, log, or
 * API projection path.
 */
export function sanitizeOutboxPayload(
  payload: Record<string, unknown>,
): Record<string, string | number | boolean | null> {
  const sanitized: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (key.length === 0 || key.length > 80) continue;
    if (
      /(password|token|secret|authorization|address|cin|document|housing|registration|priority|notes|phone|email|birth|guardian|evidence|proof|receipt|image|file|storage)/i.test(
        key,
      )
    ) {
      continue;
    }
    if (value === null || typeof value === "boolean") {
      sanitized[key] = value;
      continue;
    }
    if (typeof value === "number") {
      if (Number.isSafeInteger(value) || Number.isFinite(value)) {
        sanitized[key] = value;
      }
      continue;
    }
    if (typeof value === "string") {
      if (value.length > 1_000) continue;
      sanitized[key] = value;
    }
  }
  return sanitized;
}
