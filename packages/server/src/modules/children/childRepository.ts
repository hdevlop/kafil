import { asc, eq } from "drizzle-orm";
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
  status: children.status,
  createdAt: children.createdAt,
  updatedAt: children.updatedAt,
  familyStatus: usersTable.status,
  guardianLegalName: familyProfiles.guardianLegalName,
};

@Repository("default")
export class ChildRepository {
  @DB() private db!: KafilDatabase;

  list(limit: number, offset: number, familyProfileId?: string) {
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

    return familyProfileId
      ? query.where(eq(children.familyProfileId, familyProfileId))
      : query;
  }

  async findById(id: string) {
    const [child] = await this.db
      .select()
      .from(children)
      .where(eq(children.id, id))
      .limit(1);
    return child;
  }

  listByFamilyId(familyProfileId: string) {
    return this.db
      .select()
      .from(children)
      .where(eq(children.familyProfileId, familyProfileId))
      .orderBy(asc(children.createdAt));
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
