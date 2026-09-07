import { z } from "zod";

export const notificationLocaleDto = z.enum(["en", "fr", "ar", "es"]);

function parseUnreadFlag(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
    return undefined;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }
  return undefined;
}

export const notificationListQuery = z.object({
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unread: z
    .preprocess(parseUnreadFlag, z.boolean().optional())
    .optional(),
  topic: z.string().trim().min(1).max(120).optional(),
});

export const notificationIdParams = z.object({
  id: z.string().uuid(),
});

export const notificationSettingsDto = z.object({
  locale: notificationLocaleDto,
});

const base64url = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .regex(/^[A-Za-z0-9\-_]+={0,2}$/, "Must be base64url");

export const pushSubscriptionDto = z.object({
  endpoint: z.string().trim().url().min(10).max(2_000),
  p256dh: base64url,
  auth: base64url,
  userAgentFamily: z.string().trim().min(1).max(80).optional(),
});

export const pushUnsubscribeDto = z.object({
  endpoint: z.string().trim().url().min(10).max(2_000),
});

export type NotificationListQuery = z.input<typeof notificationListQuery>;
export type NotificationSettingsDto = z.input<typeof notificationSettingsDto>;
export type PushSubscriptionDto = z.input<typeof pushSubscriptionDto>;
export type PushUnsubscribeDto = z.input<typeof pushUnsubscribeDto>;
