import { describe, expect, test } from "bun:test";

import { buildNotifyItem } from "../src/features/Notifications/lib/buildNotifyItem";
import type { NotificationRecord } from "../src/features/Notifications/types";

const FALLBACK = { unknownTitle: "New activity", unknownBody: "Details." };

function record(overrides: Partial<NotificationRecord> = {}): NotificationRecord {
  return {
    id: "n-1",
    topic: "order.delivered",
    aggregateType: "order",
    aggregateId: "o-1",
    locale: "en",
    payload: {},
    readAt: null,
    createdAt: "2026-09-18T10:00:00.000Z",
    updatedAt: "2026-09-18T10:00:00.000Z",
    ...overrides,
  };
}

const cardSource = await Bun.file(
  new URL(
    "../src/features/Notifications/components/NotificationCard.tsx",
    import.meta.url,
  ),
).text();

describe("notification detail navigation", () => {
  test("every row carries an internal focus destination", () => {
    expect(buildNotifyItem(record(), "en", FALLBACK).href).toBe(
      "/orders?focus=n-1",
    );
    expect(
      buildNotifyItem(record({ topic: "contribution.expired" }), "en", FALLBACK)
        .href,
    ).toBe("/contribution?focus=n-1");
    // An unknown topic must not produce an external or guessed destination.
    const unknown = buildNotifyItem(
      record({ topic: "mystery.topic" }),
      "en",
      FALLBACK,
    );
    expect(unknown.href).toBe("/dashboard?focus=n-1");
  });

  test("the row hands navigation to the packaged item instead of running it first", () => {
    // NNotifyItem awaits the read command and only then calls onOpenItem, so
    // Kafil never navigates past a failed read. That ordering is covered by
    // najm-kit's own suite; what this pins is that Kafil still delegates.
    expect(cardSource).toContain("<NNotifyItem");
    expect(cardSource).toContain("onMarkRead={(id) => markRead.mutateAsync(id)}");
    expect(cardSource).toContain("onOpenItem=");
    expect(cardSource.indexOf("onMarkRead=")).toBeLessThan(
      cardSource.indexOf("onOpenItem="),
    );
    expect(cardSource).not.toContain("router.push(href)");
  });
});
