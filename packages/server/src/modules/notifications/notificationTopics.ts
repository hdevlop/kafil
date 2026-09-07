export const NOTIFICATION_TOPICS = [
  "contribution.submitted",
  "contribution.recorded",
  "contribution.validated",
  "contribution.rejected",
  "contribution.refunded",
  "contribution.expired",
  "order.submitted",
  "order.assisted_submitted",
  "order.approved",
  "order.rejected",
  "order.purchase_recorded",
  "order.purchase_replaced",
  "order.delivery_assigned",
  "order.delivery_reassigned",
  "order.delivery_started",
  "order.delivery_failed",
  "order.delivered",
  "order.cancelled",
  "family.fundingActivated",
  "applicant.approved",
  "applicant.rejected",
] as const;

export type NotificationTopic = (typeof NOTIFICATION_TOPICS)[number];

const TOPIC_SET = new Set<string>(NOTIFICATION_TOPICS);

export function isSupportedNotificationTopic(topic: string): topic is NotificationTopic {
  return TOPIC_SET.has(topic);
}

export type NotificationAudience = "family" | "sponsor" | "applicant";

export interface ChannelDecision {
  familyPush: boolean;
  sponsorPush: boolean;
  sponsorEmail: boolean;
  applicantEmail: boolean;
}

/**
 * Single source for the v1 channel matrix. In-app is always true for a
 * supported topic; email/push follow the high-value matrix. Families are
 * never emailed in v1.
 */
export const CHANNEL_MATRIX: Record<NotificationTopic, ChannelDecision> = {
  "contribution.submitted": {
    familyPush: false,
    sponsorPush: false,
    sponsorEmail: false,
    applicantEmail: false,
  },
  "contribution.recorded": {
    familyPush: false,
    sponsorPush: false,
    sponsorEmail: false,
    applicantEmail: false,
  },
  "contribution.validated": {
    familyPush: true,
    sponsorPush: true,
    sponsorEmail: true,
    applicantEmail: false,
  },
  "contribution.rejected": {
    familyPush: true,
    sponsorPush: true,
    sponsorEmail: true,
    applicantEmail: false,
  },
  "contribution.refunded": {
    familyPush: false,
    sponsorPush: false,
    sponsorEmail: false,
    applicantEmail: false,
  },
  "contribution.expired": {
    familyPush: false,
    sponsorPush: false,
    sponsorEmail: false,
    applicantEmail: false,
  },
  "order.submitted": {
    familyPush: false,
    sponsorPush: false,
    sponsorEmail: false,
    applicantEmail: false,
  },
  "order.assisted_submitted": {
    familyPush: false,
    sponsorPush: false,
    sponsorEmail: false,
    applicantEmail: false,
  },
  "order.approved": {
    familyPush: false,
    sponsorPush: false,
    sponsorEmail: false,
    applicantEmail: false,
  },
  "order.rejected": {
    familyPush: false,
    sponsorPush: false,
    sponsorEmail: false,
    applicantEmail: false,
  },
  "order.purchase_recorded": {
    familyPush: false,
    sponsorPush: false,
    sponsorEmail: false,
    applicantEmail: false,
  },
  "order.purchase_replaced": {
    familyPush: false,
    sponsorPush: false,
    sponsorEmail: false,
    applicantEmail: false,
  },
  "order.delivery_assigned": {
    familyPush: false,
    sponsorPush: false,
    sponsorEmail: false,
    applicantEmail: false,
  },
  "order.delivery_reassigned": {
    familyPush: false,
    sponsorPush: false,
    sponsorEmail: false,
    applicantEmail: false,
  },
  "order.delivery_started": {
    familyPush: false,
    sponsorPush: false,
    sponsorEmail: false,
    applicantEmail: false,
  },
  "order.delivery_failed": {
    familyPush: true,
    sponsorPush: true,
    sponsorEmail: true,
    applicantEmail: false,
  },
  "order.delivered": {
    familyPush: true,
    sponsorPush: true,
    sponsorEmail: true,
    applicantEmail: false,
  },
  "order.cancelled": {
    familyPush: false,
    sponsorPush: false,
    sponsorEmail: false,
    applicantEmail: false,
  },
  "family.fundingActivated": {
    familyPush: true,
    sponsorPush: true,
    sponsorEmail: true,
    applicantEmail: false,
  },
  "applicant.approved": {
    familyPush: false,
    sponsorPush: true,
    sponsorEmail: false,
    applicantEmail: true,
  },
  "applicant.rejected": {
    familyPush: false,
    sponsorPush: false,
    sponsorEmail: false,
    applicantEmail: true,
  },
};

/**
 * Topic-specific payload allowlist applied after the shared outbox sanitizer.
 * Only these scalar keys may reach an inbox row, email template, push body,
 * log, or API projection.
 */
const PAYLOAD_ALLOWLISTS: Record<NotificationTopic, readonly string[]> = {
  "contribution.submitted": ["amountMinor"],
  "contribution.recorded": ["amountMinor"],
  "contribution.validated": ["amountMinor"],
  "contribution.rejected": [],
  "contribution.refunded": ["amountMinor"],
  "contribution.expired": ["amountMinor"],
  "order.submitted": ["orderNumber", "totalMinor", "placementSource"],
  "order.assisted_submitted": ["orderNumber", "totalMinor", "placementSource"],
  "order.approved": ["orderNumber", "status"],
  "order.rejected": ["orderNumber", "status"],
  "order.purchase_recorded": ["orderNumber", "status", "actualTotalMinor"],
  "order.purchase_replaced": ["orderNumber", "actualTotalMinor"],
  "order.delivery_assigned": ["orderNumber", "status"],
  "order.delivery_reassigned": ["orderNumber", "status"],
  "order.delivery_started": ["orderNumber", "status"],
  "order.delivery_failed": ["orderNumber", "status"],
  "order.delivered": ["orderNumber", "status"],
  "order.cancelled": ["orderNumber", "status"],
  "family.fundingActivated": ["fundedMinor", "targetMinor"],
  "applicant.approved": ["applicantId", "transition", "sponsorProfileId"],
  "applicant.rejected": ["applicantId", "transition"],
};

export function buildTopicPayload(
  topic: NotificationTopic,
  raw: Record<string, string | number | boolean | null>,
): Record<string, string | number | boolean | null> {
  const allowed = PAYLOAD_ALLOWLISTS[topic];
  const payload: Record<string, string | number | boolean | null> = {};
  for (const key of allowed) {
    const value = raw[key];
    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      payload[key] = value;
    }
  }
  return payload;
}

export function topicAggregate(topic: NotificationTopic): string {
  if (topic.startsWith("contribution.")) return "contribution";
  if (topic.startsWith("order.")) return "order";
  if (topic.startsWith("family.")) return "family";
  return "applicant";
}
