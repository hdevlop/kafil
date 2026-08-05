import { and, asc, eq, ilike } from "drizzle-orm";
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

@Repository("default")
export class ChildRepository {
  @DB() private db!: KafilDatabase;

  list(
    limit: number,
    offset: number,
    filters: {
      familyProfileId?: string;
      search?: string;
      gender?: "F" | "M";
      status?: "active" | "inactive";
    } = {},
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

    const condition = and(
      filters.familyProfileId ? eq(children.familyProfileId, filters.familyProfileId) : undefined,
      filters.search ? ilike(children.legalName, `%${filters.search}%`) : undefined,
      filters.gender ? eq(children.gender, filters.gender) : undefined,
      filters.status ? eq(children.status, filters.status) : undefined,
    );
    return condition ? query.where(condition) : query;
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
    filters: { search?: string; gender?: "F" | "M"; status?: "active" | "inactive" } = {},
  ) {
    return this.db
      .select(childFamilySelection)
      .from(children)
      .where(and(
        eq(children.familyProfileId, familyProfileId),
        filters.search ? ilike(children.legalName, `%${filters.search}%`) : undefined,
        filters.gender ? eq(children.gender, filters.gender) : undefined,
        filters.status ? eq(children.status, filters.status) : undefined,
      ))
      .orderBy(asc(children.createdAt))
      .limit(limit)
      .offset(offset);
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
