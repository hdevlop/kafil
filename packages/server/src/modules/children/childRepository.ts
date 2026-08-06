import { and, asc, eq, ilike, sql } from "drizzle-orm";
import { usersTable } from "najm-auth/pg";
import { Repository } from "najm-core";
import { DB } from "najm-database";

import type { KafilDatabase } from "../../database/types";
import { familyProfiles } from "../families/familySchema";
import { children, type NewChild } from "./childSchema";

const childListSelection = {
  id: children.id,
  familyProfileId: children.familyProfileId,
  legalName: children.legalName,
  dateOfBirth: children.dateOfBirth,
  gender: children.gender,
  schoolLevel: children.schoolLevel,
  clothingSize: children.clothingSize,
  shoeSize: children.shoeSize,
  notes: children.notes,
  image: children.image,
  status: children.status,
  createdAt: children.createdAt,
  updatedAt: children.updatedAt,
  familyStatus: usersTable.status,
  guardianLegalName: familyProfiles.guardianLegalName,
};

const childFamilySelection = {
  id: children.id,
  familyProfileId: children.familyProfileId,
  legalName: children.legalName,
  dateOfBirth: children.dateOfBirth,
  gender: children.gender,
  schoolLevel: children.schoolLevel,
  clothingSize: children.clothingSize,
  shoeSize: children.shoeSize,
  notes: children.notes,
  image: children.image,
  status: children.status,
  createdAt: children.createdAt,
  updatedAt: children.updatedAt,
};

export interface ChildFamilyListFilters {
  search?: string;
  gender?: "F" | "M";
  status?: "active" | "inactive";
}

export interface ChildListFilters extends ChildFamilyListFilters {
  familyProfileId?: string;
}

/** The one place the child list decides which rows it is about. */
function buildChildListCondition(filters: ChildListFilters) {
  return and(
    filters.familyProfileId ? eq(children.familyProfileId, filters.familyProfileId) : undefined,
    filters.search ? ilike(children.legalName, `%${filters.search}%`) : undefined,
    filters.gender ? eq(children.gender, filters.gender) : undefined,
    filters.status ? eq(children.status, filters.status) : undefined,
  );
}

@Repository("default")
export class ChildRepository {
  @DB() private db!: KafilDatabase;

  list(
    limit: number,
    offset: number,
    filters: ChildListFilters = {},
  ) {
    const query = this.db
      .select(childListSelection)
      .from(children)
      .innerJoin(
        familyProfiles,
        eq(children.familyProfileId, familyProfiles.id),
      )
      .leftJoin(usersTable, eq(familyProfiles.userId, usersTable.id))
      .orderBy(asc(children.createdAt))
      .limit(limit)
      .offset(offset);

    const condition = buildChildListCondition(filters);
    return condition ? query.where(condition) : query;
  }

  /**
   * Rows matching `filters`, ignoring the page window. Keeps the profile join
   * so a child whose family row is missing is excluded from the total exactly
   * as it is from the rows.
   */
  async count(filters: ChildListFilters = {}) {
    const query = this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(children)
      .innerJoin(
        familyProfiles,
        eq(children.familyProfileId, familyProfiles.id),
      )
      .leftJoin(usersTable, eq(familyProfiles.userId, usersTable.id));
    const condition = buildChildListCondition(filters);
    const [row] = condition ? await query.where(condition) : await query;
    return row?.total ?? 0;
  }

  async findById(id: string) {
    const [child] = await this.db
      .select()
      .from(children)
      .where(eq(children.id, id))
      .limit(1);
    return child;
  }

  listByFamilyId(
    familyProfileId: string,
    limit = 100,
    offset = 0,
    filters: ChildFamilyListFilters = {},
  ) {
    return this.db
      .select(childFamilySelection)
      .from(children)
      .where(buildChildListCondition({ ...filters, familyProfileId }))
      .orderBy(asc(children.createdAt))
      .limit(limit)
      .offset(offset);
  }

  /** The family-scoped counterpart of `count`, matching `listByFamilyId`. */
  async countByFamilyId(
    familyProfileId: string,
    filters: ChildFamilyListFilters = {},
  ) {
    const [row] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(children)
      .where(buildChildListCondition({ ...filters, familyProfileId }));
    return row?.total ?? 0;
  }

  async findByImagePath(imagePath: string) {
    const [child] = await this.db
      .select({
        id: children.id,
        familyProfileId: children.familyProfileId,
        image: children.image,
      })
      .from(children)
      .where(eq(children.image, imagePath))
      .limit(1);
    return child;
  }

  async create(data: NewChild) {
    const [child] = await this.db.insert(children).values(data).returning();
    return child;
  }

  async update(
    id: string,
    data: Partial<
      Pick<
        NewChild,
        | "legalName"
        | "dateOfBirth"
        | "gender"
        | "schoolLevel"
        | "clothingSize"
        | "shoeSize"
        | "notes"
        | "image"
        | "status"
      >
    >,
  ) {
    const [child] = await this.db
      .update(children)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(children.id, id))
      .returning();
    return child;
  }

  async delete(id: string) {
    const [child] = await this.db
      .delete(children)
      .where(eq(children.id, id))
      .returning();
    return child;
  }
}
