import { describe, expect, it } from "bun:test";

import { OutboxRepository, OutboxService } from "../src/modules/outbox";

describe("durable outbox", () => {
  it("persists only safe primitive payload fields", async () => {
    const events: Record<string, unknown>[] = [];
    const service = new OutboxService({
      create: async (event: Record<string, unknown>) => {
        events.push(event);
        return { id: "outbox-1", ...event };
      },
    } as unknown as OutboxRepository);

    await service.enqueue({
      topic: "contribution.validated",
      aggregateType: "contribution",
      aggregateId: "contribution-1",
      payload: {
        amountMinor: 500,
        token: "must-not-persist",
        exactAddress: "must-not-persist",
        nested: { unsupported: true },
      },
    });

    expect(events).toEqual([
      expect.objectContaining({ payload: { amountMinor: 500 } }),
    ]);
  });
});
