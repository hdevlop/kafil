import { asc, eq } from "drizzle-orm";
import { rolesTable, usersTable } from "najm-auth/pg";
import { Repository } from "najm-core";
import { DB } from "najm-database";

import type { KafilDatabase } from "../../database/types";
import {
  type NewOperatorProfile,
  operatorProfiles,
} from "./operatorSchema";

const operatorSelection = {
  id: operatorProfiles.id,
  userId: operatorProfiles.userId,
  name: usersTable.name,
  email: usersTable.email,
  image: usersTable.image,
  emailVerified: usersTable.emailVerified,
  status: usersTable.status,
  role: rolesTable.name,
  phone: operatorProfiles.phone,
  cin: operatorProfiles.cin,
  gender: operatorProfiles.gender,
  address: operatorProfiles.address,
  dateOfBirth: operatorProfiles.dateOfBirth,
  jobTitle: operatorProfiles.jobTitle,
  notes: operatorProfiles.notes,
  createdAt: operatorProfiles.createdAt,
  updatedAt: operatorProfiles.updatedAt,
};

@Repository("default")
export class OperatorRepository {
  @DB() private db!: KafilDatabase;

  list(limit: number, offset: number) {
    return this.db
      .select(operatorSelection)
      .from(operatorProfiles)
      .innerJoin(usersTable, eq(operatorProfiles.userId, usersTable.id))
      .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .orderBy(asc(operatorProfiles.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async findById(id: string) {
    const [operator] = await this.db
      .select(operatorSelection)
      .from(operatorProfiles)
      .innerJoin(usersTable, eq(operatorProfiles.userId, usersTable.id))
      .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .where(eq(operatorProfiles.id, id))
      .limit(1);
    return operator;
  }

  async findByUserId(userId: string) {
    const [operator] = await this.db
      .select(operatorSelection)
      .from(operatorProfiles)
      .innerJoin(usersTable, eq(operatorProfiles.userId, usersTable.id))
      .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .where(eq(operatorProfiles.userId, userId))
      .limit(1);
    return operator;
  }

  async findByEmail(email: string) {
    const [operator] = await this.db
      .select(operatorSelection)
      .from(operatorProfiles)
      .innerJoin(usersTable, eq(operatorProfiles.userId, usersTable.id))
      .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .where(eq(usersTable.email, email))
      .limit(1);
    return operator;
  }

  async findByPhone(phone: string) {
    const [operator] = await this.db
      .select(operatorSelection)
      .from(operatorProfiles)
      .innerJoin(usersTable, eq(operatorProfiles.userId, usersTable.id))
      .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .where(eq(operatorProfiles.phone, phone))
      .limit(1);
    return operator;
  }

  async findByCin(cin: string) {
    const [operator] = await this.db
      .select(operatorSelection)
      .from(operatorProfiles)
      .innerJoin(usersTable, eq(operatorProfiles.userId, usersTable.id))
      .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .where(eq(operatorProfiles.cin, cin))
      .limit(1);
    return operator;
  }

  async create(data: NewOperatorProfile) {
    const [profile] = await this.db
      .insert(operatorProfiles)
      .values(data)
      .returning({ id: operatorProfiles.id });
    return this.findById(profile.id);
  }

  async update(
    id: string,
    data: Partial<
      Pick<
        NewOperatorProfile,
        | "phone"
        | "cin"
        | "gender"
        | "address"
        | "dateOfBirth"
        | "jobTitle"
        | "notes"
      >
    >,
  ) {
    await this.db
      .update(operatorProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(operatorProfiles.id, id));
    return this.findById(id);
  }

  async delete(id: string) {
    const existing = await this.findById(id);
    if (!existing) {
      return undefined;
    }
    await this.db.delete(operatorProfiles).where(eq(operatorProfiles.id, id));
    return existing;
  }
}
