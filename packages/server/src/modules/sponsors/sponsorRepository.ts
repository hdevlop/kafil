import { asc, eq } from "drizzle-orm";
import { rolesTable, usersTable } from "najm-auth/pg";
import { Repository } from "najm-core";
import { DB } from "najm-database";

import type { KafilDatabase } from "../../database/types";
import { contributions } from "../contributions/contributionSchema";
import { supportAssignments } from "../supportAssignments/supportAssignmentSchema";
import {
  type NewSponsorProfile,
  sponsorProfiles,
} from "./sponsorSchema";

const sponsorSelection = {
  id: sponsorProfiles.id,
  userId: sponsorProfiles.userId,
  name: usersTable.name,
  email: usersTable.email,
  image: usersTable.image,
  emailVerified: usersTable.emailVerified,
  status: usersTable.status,
  role: rolesTable.name,
  phone: sponsorProfiles.phone,
  cin: sponsorProfiles.cin,
  gender: sponsorProfiles.gender,
  address: sponsorProfiles.address,
  dateOfBirth: sponsorProfiles.dateOfBirth,
  notes: sponsorProfiles.notes,
  createdAt: sponsorProfiles.createdAt,
  updatedAt: sponsorProfiles.updatedAt,
};

@Repository("default")
export class SponsorRepository {
  @DB() private db!: KafilDatabase;

  list(limit: number, offset: number) {
    return this.db
      .select(sponsorSelection)
      .from(sponsorProfiles)
      .innerJoin(usersTable, eq(sponsorProfiles.userId, usersTable.id))
      .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .orderBy(asc(sponsorProfiles.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async findById(id: string) {
    const [sponsor] = await this.db
      .select(sponsorSelection)
      .from(sponsorProfiles)
      .innerJoin(usersTable, eq(sponsorProfiles.userId, usersTable.id))
      .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .where(eq(sponsorProfiles.id, id))
      .limit(1);
    return sponsor;
  }

  async findByUserId(userId: string) {
    const [sponsor] = await this.db
      .select(sponsorSelection)
      .from(sponsorProfiles)
      .innerJoin(usersTable, eq(sponsorProfiles.userId, usersTable.id))
      .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .where(eq(sponsorProfiles.userId, userId))
      .limit(1);
    return sponsor;
  }

  async findByEmail(email: string) {
    const [sponsor] = await this.db
      .select(sponsorSelection)
      .from(sponsorProfiles)
      .innerJoin(usersTable, eq(sponsorProfiles.userId, usersTable.id))
      .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .where(eq(usersTable.email, email))
      .limit(1);
    return sponsor;
  }

  async findByPhone(phone: string) {
    const [sponsor] = await this.db
      .select(sponsorSelection)
      .from(sponsorProfiles)
      .innerJoin(usersTable, eq(sponsorProfiles.userId, usersTable.id))
      .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .where(eq(sponsorProfiles.phone, phone))
      .limit(1);
    return sponsor;
  }

  async findByCin(cin: string) {
    const [sponsor] = await this.db
      .select(sponsorSelection)
      .from(sponsorProfiles)
      .innerJoin(usersTable, eq(sponsorProfiles.userId, usersTable.id))
      .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .where(eq(sponsorProfiles.cin, cin))
      .limit(1);
    return sponsor;
  }

  async create(data: NewSponsorProfile) {
    const [profile] = await this.db
      .insert(sponsorProfiles)
      .values(data)
      .returning({ id: sponsorProfiles.id });
    return this.findById(profile.id);
  }

  async update(
    id: string,
    data: Partial<
      Pick<
        NewSponsorProfile,
        | "phone"
        | "cin"
        | "gender"
        | "address"
        | "dateOfBirth"
        | "notes"
      >
    >,
  ) {
    await this.db
      .update(sponsorProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(sponsorProfiles.id, id));
    return this.findById(id);
  }

  async delete(id: string) {
    const existing = await this.findById(id);
    if (!existing) {
      return undefined;
    }
    await this.db.delete(sponsorProfiles).where(eq(sponsorProfiles.id, id));
    return existing;
  }

  async hasLinkedHistory(id: string) {
    const [assignment] = await this.db
      .select({ id: supportAssignments.id })
      .from(supportAssignments)
      .where(eq(supportAssignments.sponsorProfileId, id))
      .limit(1);
    if (assignment) return true;

    const [contribution] = await this.db
      .select({ id: contributions.id })
      .from(contributions)
      .where(eq(contributions.sponsorProfileId, id))
      .limit(1);
    return Boolean(contribution);
  }
}
