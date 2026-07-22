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
}

function sanitizePayload(
  payload: Record<string, unknown>,
): Record<string, string | number | boolean | null> {
  const sanitized: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (
      !/(password|token|secret|authorization|address|cin|document)/i.test(key) &&
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
