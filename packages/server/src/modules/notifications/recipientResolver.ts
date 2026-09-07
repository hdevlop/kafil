import { sql } from "drizzle-orm";
import { Service } from "najm-core";

import { NotificationRepository } from "./notificationRepository";
import type { NotificationTopic } from "./notificationTopics";

export interface ResolvedRecipients {
  familyUserId: string | null;
  sponsorUserIds: string[];
  applicantUserId: string | null;
  all: string[];
}

@Service()
export class NotificationRecipientResolver {
  constructor(private readonly notifications: NotificationRepository) {}

  async resolve(
    topic: NotificationTopic,
    aggregateType: string,
    aggregateId: string,
    eventTime: Date,
  ): Promise<ResolvedRecipients> {
    if (topic.startsWith("contribution.")) {
      return this.forContribution(aggregateId);
    }
    if (topic.startsWith("order.")) {
      return this.forOrder(aggregateId, eventTime);
    }
    if (topic === "family.fundingActivated") {
      return this.forFamily(aggregateId, eventTime);
    }
    return this.forApplicant(aggregateId);
  }

  private async forContribution(contributionId: string) {
    const row =
      await this.notifications.findContributionParties(contributionId);
    if (!row) return { familyUserId: null, sponsorUserIds: [], applicantUserId: null, all: [] };
    const all = [row.sponsorUserId, row.familyUserId].filter(Boolean);
    return {
      familyUserId: row.familyUserId,
      sponsorUserIds: [row.sponsorUserId],
      applicantUserId: null,
      all: [...new Set(all)],
    };
  }

  private async forOrder(orderId: string, eventTime: Date) {
    const order = await this.notifications.findOrderFamily(orderId);
    if (!order) {
      return { familyUserId: null, sponsorUserIds: [], applicantUserId: null, all: [] };
    }
    const sponsors = await this.sponsorUsersCoveringFamily(
      order.familyProfileId,
      eventTime,
    );
    const all = [order.familyUserId, ...sponsors].filter(Boolean);
    return {
      familyUserId: order.familyUserId,
      sponsorUserIds: sponsors,
      applicantUserId: null,
      all: [...new Set(all)],
    };
  }

  private async forFamily(familyId: string, eventTime: Date) {
    const userId = await this.notifications.findFamilyUser(familyId);
    if (!userId) {
      return { familyUserId: null, sponsorUserIds: [], applicantUserId: null, all: [] };
    }
    const sponsors = await this.sponsorUsersCoveringFamily(familyId, eventTime);
    const all = [userId, ...sponsors].filter(Boolean);
    return {
      familyUserId: userId,
      sponsorUserIds: sponsors,
      applicantUserId: null,
      all: [...new Set(all)],
    };
  }

  private async forApplicant(applicantId: string) {
    const authUserId =
      await this.notifications.findApplicantAuthUser(applicantId);
    if (!authUserId) {
      return { familyUserId: null, sponsorUserIds: [], applicantUserId: null, all: [] };
    }
    return {
      familyUserId: null,
      sponsorUserIds: [],
      applicantUserId: authUserId,
      all: [authUserId],
    };
  }

  /**
   * Temporal assignment resolution: the sponsor covered the family at the
   * event occurrence timestamp, not merely at current state.
   */
  async sponsorUsersCoveringFamily(familyProfileId: string, eventTime: Date) {
    return this.notifications.findSponsorUsersCoveringFamily(
      familyProfileId,
      eventTime,
    );
  }

  async familyUserForFamily(familyProfileId: string) {
    return this.notifications.findFamilyUser(familyProfileId);
  }

  async sponsorUserForContribution(contributionId: string) {
    const resolved = await this.forContribution(contributionId);
    return resolved.sponsorUserIds[0] ?? null;
  }
}

export function _assignmentCoverageCondition(
  startedAt: unknown,
  endedAt: unknown,
  eventTime: Date,
) {
  return sql`(${startedAt} <= ${eventTime} AND (${endedAt} IS NULL OR ${endedAt} > ${eventTime}))`;
}
