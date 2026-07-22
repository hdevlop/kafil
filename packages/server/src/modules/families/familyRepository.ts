import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { rolesTable, usersTable } from "najm-auth/pg";
import { Repository } from "najm-core";
import { DB } from "najm-database";

import type { KafilDatabase } from "../../database/types";
import {
  budgetAccounts,
  budgetLedgerEntries,
  monthlyBudgetLimits,
} from "../budgets/budgetSchema";
import { children } from "../children/childSchema";
import {
  contributionPlans,
  contributions,
} from "../contributions/contributionSchema";
import { documentObjects } from "../documents/documentSchema";
import {
  cartItems,
  carts,
  orderItems,
  orders,
  orderStatusEvents,
} from "../orders/orderSchema";
import { sponsorProfiles } from "../sponsors/sponsorSchema";
import { supportAssignments } from "../supportAssignments/supportAssignmentSchema";
import { familyProfiles, type NewFamilyProfile } from "./familySchema";

const familySelection = {
  id: familyProfiles.id,
  userId: familyProfiles.userId,
  relationshipToChildren: familyProfiles.relationshipToChildren,
  notes: familyProfiles.notes,
  createdAt: familyProfiles.createdAt,
  updatedAt: familyProfiles.updatedAt,
  name: usersTable.name,
  email: usersTable.email,
  image: usersTable.image,
  emailVerified: usersTable.emailVerified,
  status: usersTable.status,
  role: rolesTable.name,
  fundingStatus: familyProfiles.fundingStatus,
  fundingTargetMinor: familyProfiles.fundingTargetMinor,
  fundingActivatedAt: familyProfiles.fundingActivatedAt,
  guardianLegalName: familyProfiles.guardianLegalName,
  guardianCin: familyProfiles.guardianCin,
  guardianDateOfBirth: familyProfiles.guardianDateOfBirth,
  exactAddress: familyProfiles.exactAddress,
  phone: familyProfiles.phone,
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
export class FamilyRepository {
  @DB() private db!: KafilDatabase;

  list(limit: number, offset: number) {
    return this.selectFamily()
      .orderBy(asc(familyProfiles.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async findById(id: string) {
    const [family] = await this.selectFamily()
      .where(eq(familyProfiles.id, id))
      .limit(1);
    return family;
  }

  async findByUserId(userId: string) {
    const [family] = await this.selectFamily()
      .where(eq(familyProfiles.userId, userId))
      .limit(1);
    return family;
  }

  async findByPhone(phone: string) {
    const [family] = await this.selectFamily()
      .where(eq(familyProfiles.phone, phone))
      .limit(1);
    return family;
  }

  async findByGuardianCin(guardianCin: string) {
    const [family] = await this.selectFamily()
      .where(eq(familyProfiles.guardianCin, guardianCin))
      .limit(1);
    return family;
  }

  listPendingFunding() {
    return this.selectFamily().where(
      eq(familyProfiles.fundingStatus, "pending_funding"),
    );
  }

  async listActiveSponsorsForFamilies(familyProfileIds: string[]) {
    if (familyProfileIds.length === 0) return [];

    return this.db
      .select({
        familyProfileId: supportAssignments.familyProfileId,
        sponsorProfileId: sponsorProfiles.id,
        sponsorName: usersTable.name,
      })
      .from(supportAssignments)
      .innerJoin(
        sponsorProfiles,
        eq(supportAssignments.sponsorProfileId, sponsorProfiles.id),
      )
      .innerJoin(usersTable, eq(sponsorProfiles.userId, usersTable.id))
      .where(
        and(
          inArray(supportAssignments.familyProfileId, familyProfileIds),
          eq(supportAssignments.status, "active"),
        ),
      )
      .orderBy(asc(supportAssignments.familyProfileId), asc(usersTable.name));
  }

  async activateFunding(id: string, activatedAt: Date) {
    const [family] = await this.db
      .update(familyProfiles)
      .set({
        fundingStatus: "active",
        fundingActivatedAt: activatedAt,
        updatedAt: activatedAt,
      })
      .where(
        and(
          eq(familyProfiles.id, id),
          eq(familyProfiles.fundingStatus, "pending_funding"),
        ),
      )
      .returning({ id: familyProfiles.id });
    return family ? this.findById(family.id) : undefined;
  }

  async create(data: NewFamilyProfile) {
    const [family] = await this.db
      .insert(familyProfiles)
      .values(data)
      .returning({ id: familyProfiles.id });
    return this.findById(family.id);
  }

  async update(
    id: string,
    data: Partial<
      Pick<
        NewFamilyProfile,
        | "relationshipToChildren"
        | "notes"
        | "fundingTargetMinor"
        | "guardianLegalName"
        | "guardianCin"
        | "guardianDateOfBirth"
        | "exactAddress"
        | "phone"
      >
    >,
  ) {
    await this.db
      .update(familyProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(familyProfiles.id, id));
    return this.findById(id);
  }

  /** Permanently removes the complete family graph for an admin-authorized delete. */
  async deleteWithLinkedRecords(id: string) {
    const familyAssignmentIds = this.db
      .select({ id: supportAssignments.id })
      .from(supportAssignments)
      .where(eq(supportAssignments.familyProfileId, id));
    const familyOrderIds = this.db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.familyProfileId, id));
    const familyCartIds = this.db
      .select({ id: carts.id })
      .from(carts)
      .where(eq(carts.familyProfileId, id));
    const familyBudgetIds = this.db
      .select({ id: budgetAccounts.id })
      .from(budgetAccounts)
      .where(eq(budgetAccounts.familyProfileId, id));

    await this.db.delete(contributions).where(eq(contributions.familyProfileId, id));
    await this.db
      .delete(contributionPlans)
      .where(inArray(contributionPlans.supportAssignmentId, familyAssignmentIds));
    await this.db
      .delete(orderStatusEvents)
      .where(inArray(orderStatusEvents.orderId, familyOrderIds));
    await this.db
      .delete(orderItems)
      .where(inArray(orderItems.orderId, familyOrderIds));
    await this.db.delete(orders).where(eq(orders.familyProfileId, id));
    await this.db
      .delete(cartItems)
      .where(inArray(cartItems.cartId, familyCartIds));
    await this.db.delete(carts).where(eq(carts.familyProfileId, id));
    await this.db
      .delete(monthlyBudgetLimits)
      .where(inArray(monthlyBudgetLimits.budgetAccountId, familyBudgetIds));
    await this.db
      .delete(budgetLedgerEntries)
      .where(inArray(budgetLedgerEntries.budgetAccountId, familyBudgetIds));
    await this.db
      .delete(budgetAccounts)
      .where(eq(budgetAccounts.familyProfileId, id));
    await this.db
      .delete(documentObjects)
      .where(eq(documentObjects.familyProfileId, id));
    await this.db
      .delete(supportAssignments)
      .where(eq(supportAssignments.familyProfileId, id));
    await this.db.delete(children).where(eq(children.familyProfileId, id));

    const [family] = await this.db
      .delete(familyProfiles)
      .where(eq(familyProfiles.id, id))
      .returning();
    return family;
  }

  private selectFamily() {
    return this.db
      .select(familySelection)
      .from(familyProfiles)
      .innerJoin(usersTable, eq(familyProfiles.userId, usersTable.id))
      .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id));
  }
}
