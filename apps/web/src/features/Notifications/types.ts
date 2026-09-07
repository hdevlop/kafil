export type NotificationLocale = "en" | "fr" | "ar" | "es";

export interface NotificationRecord {
  id: string;
  topic: string;
  aggregateType: string;
  aggregateId: string;
  locale: string;
  payload: Record<string, string | number | boolean | null>;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListQuery {
  cursor?: string;
  limit?: number;
  unread?: boolean;
  topic?: string;
}

export interface NotificationListResult {
  rows: NotificationRecord[];
  nextCursor: string | null;
}

export interface PushConfig {
  enabled: boolean;
  publicKey: string | null;
}

export type PushStatus =
  | "unsupported"
  | "denied"
  | "granted"
  | "prompt"
  | "loading"
  | "error";
