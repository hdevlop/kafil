import { Service } from "najm-core";

import { OutboxRepository } from "./outboxRepository";

export interface EnqueueOutboxEventInput {
  topic: string;
  aggregateType: string;
  aggregateId: string;
  payload?: Record<string, unknown>;
}

@Service()
export class OutboxService {
  constructor(private readonly events: OutboxRepository) {}

  enqueue(input: EnqueueOutboxEventInput) {
    return this.events.create({
      topic: input.topic,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      payload: sanitizePayload(input.payload ?? {}),
    });
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

function sanitizePayload(
  payload: Record<string, unknown>,
): Record<string, string | number | boolean | null> {
  const sanitized: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (
      !/(password|token|secret|authorization|address|cin|document|housing|registration|priority|notes|phone|email|birth|guardian)/i.test(key) &&
      (value === null ||
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean")
    ) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
