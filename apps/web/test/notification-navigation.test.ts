import { describe, expect, test } from "bun:test";

const cardSource = await Bun.file(
  new URL(
    "../src/features/Notifications/components/NotificationCard.tsx",
    import.meta.url,
  ),
).text();

describe("notification detail navigation", () => {
  test("persists an unread row before starting its accepted navigation", () => {
    expect(cardSource).toContain("event.preventDefault()");
    expect(cardSource).toContain("await markRead.mutateAsync(notification.id)");
    expect(cardSource).toContain("router.push(href)");
    expect(
      cardSource.indexOf("await markRead.mutateAsync(notification.id)"),
    ).toBeLessThan(cardSource.indexOf("router.push(href)"));
  });
});
