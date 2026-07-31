import { and, asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { rolesTable, usersTable } from "najm-auth/pg";
import { Repository } from "najm-core";
import { DB } from "najm-database";

import type { KafilDatabase } from "../../database/types";
import { STAFF_FUNCTION_KEYS, type StaffFunctionKey } from "./staffFunctions";
import {
  type NewStaffFunction,
  type NewStaffProfile,
  staffFunctions,
  staffProfiles,
} from "./staffSchema";

export interface StaffListFilters {
  affiliation?: "internal" | "external";
  functionKey?: StaffFunctionKey;
  hasAccess?: boolean;
  search?: string;
  status?: "active" | "inactive";
}

export type StaffSortBy = "name" | "affiliation" | "phone" | "status" | "createdAt";
export type StaffSortDirection = "asc" | "desc";

const staffSelection = {
  id: staffProfiles.id,
  userId: staffProfiles.userId,
  name: staffProfiles.name,
  contactEmail: staffProfiles.contactEmail,
  phone: staffProfiles.phone,
  image: staffProfiles.image,
  affiliation: staffProfiles.affiliation,
  companyName: staffProfiles.companyName,
  cin: staffProfiles.cin,
  gender: staffProfiles.gender,
  address: staffProfiles.address,
  dateOfBirth: staffProfiles.dateOfBirth,
  jobTitle: staffProfiles.jobTitle,
  status: staffProfiles.status,
  notes: staffProfiles.notes,
  createdAt: staffProfiles.createdAt,
  updatedAt: staffProfiles.updatedAt,
  email: usersTable.email,
  emailVerified: usersTable.emailVerified,
  userStatus: usersTable.status,
  role: rolesTable.name,
};

const deliveryOptionSelection = {
  affiliation: staffProfiles.affiliation,
  companyName: staffProfiles.companyName,
  id: staffProfiles.id,
  image: staffProfiles.image,
  name: staffProfiles.name,
  phone: staffProfiles.phone,
};

export interface StaffRecord {
  address: string | null;
  affiliation: "internal" | "external";
  cin: string | null;
  companyName: string | null;
  contactEmail: string | null;
  createdAt: Date | string;
  dateOfBirth: string | null;
  email: string | null;
  emailVerified: boolean | null;
  functions: StaffFunctionKey[];
  gender: "M" | "F" | null;
  hasOperatorAccess: boolean;
  id: string;
  image: string | null;
  jobTitle: string | null;
  name: string;
  notes: string | null;
  phone: string;
  role: string | null;
  status: "active" | "inactive";
  updatedAt: Date | string;
  userId: string | null;
  userStatus: string | null;
}

export interface DeliveryStaffOption {
  affiliation: "internal" | "external";
  companyName: string | null;
  functionKeys: StaffFunctionKey[];
  id: string;
  image: string | null;
  name: string;
  phone: string;
}

@Repository("default")
export class StaffRepository {
  @DB() private db!: KafilDatabase;

  list(
    limit: number,
    offset: number,
    filters: StaffListFilters,
    sortBy: StaffSortBy = "name",
    sortDirection: StaffSortDirection = "asc",
  ) {
    const sortColumn = {
      affiliation: staffProfiles.affiliation,
      createdAt: staffProfiles.createdAt,
      name: staffProfiles.name,
      phone: staffProfiles.phone,
      status: staffProfiles.status,
    }[sortBy];
    const sort = sortDirection === "desc" ? desc : asc;
    return this.db
      .select(staffSelection)
      .from(staffProfiles)
      .leftJoin(usersTable, eq(staffProfiles.userId, usersTable.id))
      .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .where(buildStaffFilter(filters))
      .orderBy(sort(sortColumn), asc(staffProfiles.id))
      .limit(limit)
      .offset(offset);
  }

  async count(filters: StaffListFilters) {
    const [result] = await this.db
      .select({ value: count() })
      .from(staffProfiles)
      .leftJoin(usersTable, eq(staffProfiles.userId, usersTable.id))
      .where(buildStaffFilter(filters));
    return Number(result?.value ?? 0);
  }

  async listWithCounts(
    filters: StaffListFilters,
    limit: number,
    offset: number,
    sortBy: StaffSortBy = "name",
    sortDirection: StaffSortDirection = "asc",
  ) {
    const [rows, total] = await Promise.all([
      this.list(limit, offset, filters, sortBy, sortDirection),
      this.count(filters),
    ]);
    const ids = rows.map((row) => row.id);
    const functionMap = await this.loadFunctionsForIds(ids);
    return {
      rows: rows.map((row) => this.toRecord(row, functionMap.get(row.id) ?? [])),
      total,
    };
  }

  async findById(id: string) {
    const [row] = await this.db
      .select(staffSelection)
      .from(staffProfiles)
      .leftJoin(usersTable, eq(staffProfiles.userId, usersTable.id))
      .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .where(eq(staffProfiles.id, id))
      .limit(1);
    if (!row) return undefined;
    const functionMap = await this.loadFunctionsForIds([row.id]);
    return this.toRecord(row, functionMap.get(row.id) ?? []);
  }

  async findByUserId(userId: string) {
    const [row] = await this.db
      .select(staffSelection)
      .from(staffProfiles)
      .leftJoin(usersTable, eq(staffProfiles.userId, usersTable.id))
      .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .where(eq(staffProfiles.userId, userId))
      .limit(1);
    if (!row) return undefined;
    const functionMap = await this.loadFunctionsForIds([row.id]);
    return this.toRecord(row, functionMap.get(row.id) ?? []);
  }

  async findByPhone(phone: string) {
    const [row] = await this.db
      .select(staffSelection)
      .from(staffProfiles)
      .leftJoin(usersTable, eq(staffProfiles.userId, usersTable.id))
      .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .where(eq(staffProfiles.phone, phone))
      .limit(1);
    if (!row) return undefined;
    const functionMap = await this.loadFunctionsForIds([row.id]);
    return this.toRecord(row, functionMap.get(row.id) ?? []);
  }

  async findByCin(cin: string) {
    const [row] = await this.db
      .select(staffSelection)
      .from(staffProfiles)
      .leftJoin(usersTable, eq(staffProfiles.userId, usersTable.id))
      .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .where(eq(staffProfiles.cin, cin))
      .limit(1);
    if (!row) return undefined;
    const functionMap = await this.loadFunctionsForIds([row.id]);
    return this.toRecord(row, functionMap.get(row.id) ?? []);
  }

  async listActiveByFunction(functionKey: StaffFunctionKey) {
    const rows = await this.db
      .select(deliveryOptionSelection)
      .from(staffProfiles)
      .innerJoin(
        staffFunctions,
        and(
          eq(staffFunctions.staffProfileId, staffProfiles.id),
          eq(staffFunctions.functionKey, functionKey),
        ),
      )
      .where(eq(staffProfiles.status, "active"))
      .orderBy(asc(staffProfiles.name), asc(staffProfiles.id));
    const ids = rows.map((row) => row.id);
    const functionMap = await this.loadFunctionsForIds(ids);
    return rows.map((row) =>
      this.toDeliveryOption(row, functionMap.get(row.id) ?? []),
    );
  }

  async listDeliveryOptions() {
    const rows = await this.db
      .select(deliveryOptionSelection)
      .from(staffProfiles)
      .innerJoin(
        staffFunctions,
        and(
          eq(staffFunctions.staffProfileId, staffProfiles.id),
          eq(staffFunctions.functionKey, "delivery"),
        ),
      )
      .where(eq(staffProfiles.status, "active"))
      .orderBy(asc(staffProfiles.name), asc(staffProfiles.id));
    const ids = rows.map((row) => row.id);
    const functionMap = await this.loadFunctionsForIds(ids);
    return rows.map((row) =>
      this.toDeliveryOption(row, functionMap.get(row.id) ?? []),
    );
  }

  async hasOperatorFunction(staffProfileId: string) {
    const [functionRow] = await this.db
      .select({ id: staffFunctions.id })
      .from(staffFunctions)
      .where(
        and(
          eq(staffFunctions.staffProfileId, staffProfileId),
          eq(staffFunctions.functionKey, "operator"),
        ),
      )
      .limit(1);
    return Boolean(functionRow);
  }

  async createProfile(data: NewStaffProfile) {
    const [created] = await this.db
      .insert(staffProfiles)
      .values(data)
      .returning({ id: staffProfiles.id });
    return this.findById(created.id);
  }

  async updateProfile(id: string, data: Partial<NewStaffProfile>) {
    await this.db
      .update(staffProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(staffProfiles.id, id));
    return this.findById(id);
  }

  async deleteProfile(id: string) {
    const existing = await this.findById(id);
    if (!existing) return undefined;
    await this.db.delete(staffProfiles).where(eq(staffProfiles.id, id));
    return existing;
  }

  async setFunctions(
    staffProfileId: string,
    functionKeys: StaffFunctionKey[],
  ) {
    await this.db
      .delete(staffFunctions)
      .where(eq(staffFunctions.staffProfileId, staffProfileId));
    if (functionKeys.length === 0) return;
    const values: NewStaffFunction[] = functionKeys.map((functionKey) => ({
      functionKey,
      staffProfileId,
    }));
    await this.db.insert(staffFunctions).values(values);
  }

  async loadFunctionsForIds(
    staffProfileIds: readonly string[],
  ): Promise<Map<string, StaffFunctionKey[]>> {
    const map = new Map<string, StaffFunctionKey[]>();
    if (staffProfileIds.length === 0) return map;
    const rows = await this.db
      .select({
        functionKey: staffFunctions.functionKey,
        staffProfileId: staffFunctions.staffProfileId,
      })
      .from(staffFunctions)
      .where(inArray(staffFunctions.staffProfileId, [...staffProfileIds]))
      .orderBy(
        asc(staffFunctions.staffProfileId),
        asc(staffFunctions.functionKey),
      );
    for (const row of rows) {
      const list = map.get(row.staffProfileId) ?? [];
      if (isStaffFunctionKey(row.functionKey)) {
        list.push(row.functionKey);
      }
      map.set(row.staffProfileId, list);
    }
    return map;
  }

  async findIdByUserId(userId: string) {
    const [row] = await this.db
      .select({ id: staffProfiles.id })
      .from(staffProfiles)
      .where(eq(staffProfiles.userId, userId))
      .limit(1);
    return row;
  }

  async listPristineIds(ids: readonly string[]) {
    if (ids.length === 0) return new Set<string>();
    const profileRows = await this.db
      .select({
        id: staffProfiles.id,
      })
      .from(staffProfiles)
      .where(
        and(
          inArray(staffProfiles.id, [...ids]),
          sql`NOT EXISTS (
            SELECT 1 FROM "order_delivery_attempts"
            WHERE "order_delivery_attempts"."staff_profile_id" = ${staffProfiles.id}
          )`,
        ),
      );
    const pristine = new Set<string>();
    for (const profile of profileRows) {
      pristine.add(profile.id);
    }
    return pristine;
  }

  async isPristine(id: string) {
    const [row] = await this.db
      .select({
        id: staffProfiles.id,
      })
      .from(staffProfiles)
      .where(
        and(
          eq(staffProfiles.id, id),
          sql`NOT EXISTS (
            SELECT 1 FROM "order_delivery_attempts"
            WHERE "order_delivery_attempts"."staff_profile_id" = ${staffProfiles.id}
          )`,
        ),
      )
      .limit(1);
    if (!row) return false;
    return true;
  }

  private toRecord(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    row: { [K in keyof typeof staffSelection]: any },
    functionKeys: StaffFunctionKey[],
  ): StaffRecord {
    return {
      address: row.address,
      affiliation: row.affiliation,
      cin: row.cin,
      companyName: row.companyName,
      contactEmail: row.contactEmail,
      createdAt: row.createdAt,
      dateOfBirth: row.dateOfBirth,
      email: row.email,
      emailVerified: row.emailVerified,
      functions: functionKeys,
      gender: row.gender,
      hasOperatorAccess:
        functionKeys.includes("operator") && Boolean(row.userId),
      id: row.id,
      image: row.image,
      jobTitle: row.jobTitle,
      name: row.name,
      notes: row.notes,
      phone: row.phone,
      role: row.role,
      status: row.status,
      updatedAt: row.updatedAt,
      userId: row.userId,
      userStatus: row.userStatus,
    };
  }

  private toDeliveryOption(
    row: {
      affiliation: "internal" | "external";
      companyName: string | null;
      id: string;
      image: string | null;
      name: string;
      phone: string;
    },
    functionKeys: StaffFunctionKey[],
  ): DeliveryStaffOption {
    return {
      affiliation: row.affiliation,
      companyName: row.companyName,
      functionKeys,
      id: row.id,
      image: row.image,
      name: row.name,
      phone: row.phone,
    };
  }
}

function isStaffFunctionKey(value: string): value is StaffFunctionKey {
  return (STAFF_FUNCTION_KEYS as readonly string[]).includes(value);
}

function buildStaffFilter(filters: StaffListFilters) {
  const search = filters.search?.trim();
  const conditions = [
    filters.status ? eq(staffProfiles.status, filters.status) : undefined,
    filters.affiliation
      ? eq(staffProfiles.affiliation, filters.affiliation)
      : undefined,
    search
      ? or(
          ilike(staffProfiles.name, `%${search}%`),
          ilike(staffProfiles.contactEmail, `%${search}%`),
          ilike(staffProfiles.phone, `%${search}%`),
          ilike(staffProfiles.jobTitle, `%${search}%`),
          ilike(staffProfiles.companyName, `%${search}%`),
        )
      : undefined,
    filters.hasAccess === true
      ? sql`${staffProfiles.userId} IS NOT NULL`
      : filters.hasAccess === false
        ? sql`${staffProfiles.userId} IS NULL`
        : undefined,
  ].filter((condition) => condition !== undefined);
  if (filters.functionKey) {
    conditions.push(
      sql`EXISTS (
        SELECT 1
        FROM ${staffFunctions}
        WHERE ${staffFunctions.staffProfileId} = ${staffProfiles.id}
          AND ${staffFunctions.functionKey} = ${filters.functionKey}
      )`,
    );
  }
  return conditions.length ? and(...conditions) : undefined;
}
