import { and, asc, desc, eq, ilike, isNull, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Repository } from "najm-core";
import { DB } from "najm-database";
import { usersTable } from "najm-auth/pg";

import type { KafilDatabase } from "../../database/types";
import { children } from "../children/childSchema";
import { familyProfiles } from "../families/familySchema";
import { sponsorProfiles } from "../sponsors/sponsorSchema";
import { contributionPlans } from "../contributions/contributionSchema";
import {
  supportAssignments,
  type NewSupportAssignment,
} from "./supportAssignmentSchema";

export interface SupportAssignmentFilters {
  sponsorSearch?: string;
  familySearch?: string;
  sponsorProfileId?: string;
  familyProfileId?: string;
  childId?: string;
  status?: "active" | "ended";
}

const sponsorUsers = alias(usersTable, "support_assignment_sponsor_users");
const familyUsers = alias(usersTable, "support_assignment_family_users");

const assignmentListSelection = {
  id: supportAssignments.id,
  sponsorProfileId: supportAssignments.sponsorProfileId,
  familyProfileId: supportAssignments.familyProfileId,
  childId: supportAssignments.childId,
  status: supportAssignments.status,
  startedAt: supportAssignments.startedAt,
  endedAt: supportAssignments.endedAt,
  assignedByUserId: supportAssignments.assignedByUserId,
  endedByUserId: supportAssignments.endedByUserId,
  notes: supportAssignments.notes,
  createdAt: supportAssignments.createdAt,
  updatedAt: supportAssignments.updatedAt,
  sponsorLabel: sponsorUsers.name,
  sponsorImage: sponsorUsers.image,
  sponsorGender: sponsorProfiles.gender,
  sponsorEmail: sponsorUsers.email,
  sponsorPhone: sponsorProfiles.phone,
  familyLabel: familyProfiles.guardianLegalName,
  sponsorshipPriceMinor: sql<number | null>`(
    select ${contributionPlans.amountMinor}
    from ${contributionPlans}
    where ${contributionPlans.supportAssignmentId} = ${supportAssignments.id}
      and ${contributionPlans.status} = 'active'
    order by ${contributionPlans.createdAt} desc
    limit 1
  )`,
};

const sponsorAssignmentSelection = {
  id: supportAssignments.id,
  sponsorProfileId: supportAssignments.sponsorProfileId,
  familyProfileId: supportAssignments.familyProfileId,
  childId: supportAssignments.childId,
  status: supportAssignments.status,
  startedAt: supportAssignments.startedAt,
  endedAt: supportAssignments.endedAt,
  createdAt: supportAssignments.createdAt,
  updatedAt: supportAssignments.updatedAt,
};

const sponsorFamilyCatalogSelection = {
  id: familyProfiles.id,
  name: usersTable.name,
  image: usersTable.image,
  supportPriority: familyProfiles.supportPriority,
  fundingStatus: familyProfiles.fundingStatus,
  fundingTargetMinor: familyProfiles.fundingTargetMinor,
  fundingActivatedAt: familyProfiles.fundingActivatedAt,
  activeChildCount: sql<number>`(
    select count(*)::int
    from ${children}
    where ${children.familyProfileId} = ${familyProfiles.id}
      and ${children.status} = 'active'
  )`,
  activeSponsorCount: sql<number>`(
    select count(distinct ${supportAssignments.sponsorProfileId})::int
    from ${supportAssignments}
    where ${supportAssignments.familyProfileId} = ${familyProfiles.id}
      and ${supportAssignments.status} = 'active'
  )`,
};

@Repository("default")
export class SupportAssignmentRepository {
  @DB() private db!: KafilDatabase;

  list(limit: number, offset: number, filters: SupportAssignmentFilters) {
    const condition = assignmentFilter(filters);
    const query = this.db
      .select(assignmentListSelection)
      .from(supportAssignments)
      .innerJoin(sponsorProfiles, eq(supportAssignments.sponsorProfileId, sponsorProfiles.id))
      .innerJoin(sponsorUsers, eq(sponsorProfiles.userId, sponsorUsers.id))
      .innerJoin(familyProfiles, eq(supportAssignments.familyProfileId, familyProfiles.id))
      .innerJoin(familyUsers, eq(familyProfiles.userId, familyUsers.id))
      .orderBy(
        desc(supportAssignments.createdAt),
        desc(supportAssignments.id),
      )
      .limit(limit)
      .offset(offset);
    return condition ? query.where(condition) : query;
  }

  listOwn(
    userId: string,
    limit: number,
    offset: number,
    status?: "active" | "ended",
  ) {
    const condition = status
      ? and(
          eq(sponsorProfiles.userId, userId),
          eq(supportAssignments.status, status),
        )
      : eq(sponsorProfiles.userId, userId);
    return this.db
      .select(sponsorAssignmentSelection)
      .from(supportAssignments)
      .innerJoin(
        sponsorProfiles,
        eq(supportAssignments.sponsorProfileId, sponsorProfiles.id),
      )
      .where(condition)
      .orderBy(asc(supportAssignments.createdAt))
      .limit(limit)
      .offset(offset);
  }

  listSponsorFamilyCatalog(
    sponsorProfileId: string,
    limit: number,
    offset: number,
    filters: { search?: string; relationship?: "supported" | "available" },
  ) {
    const ownAssignmentId = sql<string | null>`(
      select ${supportAssignments.id}
      from ${supportAssignments}
      where ${supportAssignments.familyProfileId} = ${familyProfiles.id}
        and ${supportAssignments.sponsorProfileId} = ${sponsorProfileId}
        and ${supportAssignments.status} = 'active'
        and ${supportAssignments.childId} is null
      order by ${supportAssignments.startedAt} asc
      limit 1
    )`;
    const conditions = [eq(usersTable.status, "active")];
    if (filters.search) {
      conditions.push(sql`${usersTable.name} ilike ${`%${filters.search}%`}`);
    }
    if (filters.relationship === "supported") {
      conditions.push(sql`${ownAssignmentId} is not null`);
    } else if (filters.relationship === "available") {
      conditions.push(sql`${ownAssignmentId} is null`);
    }

    return this.db
      .select({ ...sponsorFamilyCatalogSelection, assignmentId: ownAssignmentId })
      .from(familyProfiles)
      .innerJoin(usersTable, eq(familyProfiles.userId, usersTable.id))
      .where(and(...conditions))
      .orderBy(asc(familyProfiles.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async findSponsorByUserId(userId: string) {
    const [sponsor] = await this.db
      .select({ id: sponsorProfiles.id })
      .from(sponsorProfiles)
      .where(eq(sponsorProfiles.userId, userId))
      .limit(1);
    return sponsor;
  }

  async familyCanReadSponsorImage(familyUserId: string, image: string) {
    const [assignment] = await this.db
      .select({ id: supportAssignments.id })
      .from(supportAssignments)
      .innerJoin(
        familyProfiles,
        eq(supportAssignments.familyProfileId, familyProfiles.id),
      )
      .innerJoin(
        sponsorProfiles,
        eq(supportAssignments.sponsorProfileId, sponsorProfiles.id),
      )
      .innerJoin(usersTable, eq(sponsorProfiles.userId, usersTable.id))
      .where(and(
        eq(familyProfiles.userId, familyUserId),
        eq(supportAssignments.status, "active"),
        isNull(supportAssignments.childId),
        eq(usersTable.status, "active"),
        eq(usersTable.image, image),
      ))
      .limit(1);
    return Boolean(assignment);
  }

  async findById(id: string) {
    const [assignment] = await this.db
      .select()
      .from(supportAssignments)
      .where(eq(supportAssignments.id, id))
      .limit(1);
    return assignment;
  }

  async findOwnById(id: string, userId: string) {
    const [assignment] = await this.db
      .select(sponsorAssignmentSelection)
      .from(supportAssignments)
      .innerJoin(
        sponsorProfiles,
        eq(supportAssignments.sponsorProfileId, sponsorProfiles.id),
      )
      .where(
        and(
          eq(supportAssignments.id, id),
          eq(sponsorProfiles.userId, userId),
        ),
      )
      .limit(1);
    return assignment;
  }

  async findActiveByTarget(
    sponsorProfileId: string,
    familyProfileId: string,
    childId: string | null,
    excludeId?: string,
  ) {
    const childCondition = childId
      ? eq(supportAssignments.childId, childId)
      : isNull(supportAssignments.childId);
    const conditions = [
      eq(supportAssignments.sponsorProfileId, sponsorProfileId),
      eq(supportAssignments.familyProfileId, familyProfileId),
      eq(supportAssignments.status, "active"),
      childCondition,
    ];
    if (excludeId) {
      conditions.push(ne(supportAssignments.id, excludeId));
    }
    const [assignment] = await this.db
      .select({ id: supportAssignments.id })
      .from(supportAssignments)
      .where(and(...conditions))
      .limit(1);
    return assignment;
  }

  async create(data: NewSupportAssignment) {
    const [assignment] = await this.db
      .insert(supportAssignments)
      .values(data)
      .returning();
    return assignment;
  }

  async updateTarget(id: string, childId: string | null) {
    const [assignment] = await this.db
      .update(supportAssignments)
      .set({ childId, updatedAt: new Date() })
      .where(eq(supportAssignments.id, id))
      .returning();
    return assignment;
  }

  async updateNotes(id: string, notes: string | null) {
    const [assignment] = await this.db
      .update(supportAssignments)
      .set({ notes, updatedAt: new Date() })
      .where(eq(supportAssignments.id, id))
      .returning();
    return assignment;
  }

  async end(id: string, endedByUserId: string) {
    const [assignment] = await this.db
      .update(supportAssignments)
      .set({
        status: "ended",
        endedAt: new Date(),
        endedByUserId,
        updatedAt: new Date(),
      })
      .where(eq(supportAssignments.id, id))
      .returning();
    return assignment;
  }

  async findFamilySummaryByAssignmentId(id: string) {
    const [summary] = await this.db
      .select({
        familyProfileId: familyProfiles.id,
        childCount: sql<number>`count(${children.id})::int`,
      })
      .from(supportAssignments)
      .innerJoin(
        familyProfiles,
        eq(
          supportAssignments.familyProfileId,
          familyProfiles.id,
        ),
      )
      .leftJoin(
        children,
        and(
          eq(children.familyProfileId, familyProfiles.id),
          eq(children.status, "active"),
        ),
      )
      .where(eq(supportAssignments.id, id))
      .groupBy(familyProfiles.id);
    return summary;
  }

  async findChildSummaryByAssignmentId(id: string) {
    const [summary] = await this.db
      .select({
        childId: children.id,
        dateOfBirth: children.dateOfBirth,
      })
      .from(supportAssignments)
      .innerJoin(children, eq(supportAssignments.childId, children.id))
      .where(eq(supportAssignments.id, id))
      .limit(1);
    return summary;
  }
}

function assignmentFilter(filters: SupportAssignmentFilters) {
  const conditions = [
    filters.sponsorSearch
      ? ilike(sponsorUsers.name, `%${filters.sponsorSearch}%`)
      : undefined,
    filters.familySearch
      ? ilike(familyProfiles.guardianLegalName, `%${filters.familySearch}%`)
      : undefined,
    filters.sponsorProfileId
      ? eq(supportAssignments.sponsorProfileId, filters.sponsorProfileId)
      : undefined,
    filters.familyProfileId
      ? eq(supportAssignments.familyProfileId, filters.familyProfileId)
      : undefined,
    filters.childId ? eq(supportAssignments.childId, filters.childId) : undefined,
    filters.status ? eq(supportAssignments.status, filters.status) : undefined,
  ].filter((condition) => condition !== undefined);
  return conditions.length ? and(...conditions) : undefined;
}
