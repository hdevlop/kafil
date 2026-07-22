import { and, asc, eq, isNull, ne, sql } from "drizzle-orm";
import { Repository } from "najm-core";
import { DB } from "najm-database";
import { usersTable } from "najm-auth/pg";

import type { KafilDatabase } from "../../database/types";
import { children } from "../children/childSchema";
import { familyProfiles } from "../families/familySchema";
import { sponsorProfiles } from "../sponsors/sponsorSchema";
import {
  supportAssignments,
  type NewSupportAssignment,
} from "./supportAssignmentSchema";

export interface SupportAssignmentFilters {
  sponsorProfileId?: string;
  familyProfileId?: string;
  childId?: string;
  status?: "active" | "ended";
}

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
  image: usersTable.image,
  fundingStatus: familyProfiles.fundingStatus,
  fundingTargetMinor: familyProfiles.fundingTargetMinor,
  fundingActivatedAt: familyProfiles.fundingActivatedAt,
  activeChildCount: sql<number>`(
    select count(*)::int
    from ${children}
    where ${children.familyProfileId} = ${familyProfiles.id}
      and ${children.status} = 'active'
  )`,
};

@Repository("default")
export class SupportAssignmentRepository {
  @DB() private db!: KafilDatabase;

  list(limit: number, offset: number, filters: SupportAssignmentFilters) {
    const condition = assignmentFilter(filters);
    const query = this.db
      .select()
      .from(supportAssignments)
      .orderBy(asc(supportAssignments.createdAt))
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

  listSponsorFamilyCatalog(limit: number, offset: number) {
    return this.db
      .select(sponsorFamilyCatalogSelection)
      .from(familyProfiles)
      .innerJoin(usersTable, eq(familyProfiles.userId, usersTable.id))
      .where(eq(usersTable.status, "active"))
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
