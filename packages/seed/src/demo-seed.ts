import {
  ContributionService,
  FamilyService,
  OperatorService,
  SponsorService,
  SupportAssignmentService,
} from "@kafil/server/modules";
import {
  budgetLedgerEntries,
  children,
  contributions,
  db,
  familyProfiles,
  operatorProfiles,
  rolesTable,
  sponsorProfiles,
  supportAssignments,
  usersTable,
} from "@kafil/server/database";
import { and, count, eq, inArray, isNull, or, sum } from "drizzle-orm";

import type {
  DemoContribution,
  DemoFamily,
  DemoOperator,
  DemoSeedData,
  DemoSponsor,
  DemoSupportAssignment,
} from "./scripts/demo/generator";

type DemoKind = "family" | "operator" | "sponsor";

interface DemoAccountIdentity {
  email: string;
  id: string;
  kind: DemoKind;
  role: DemoKind;
  userId: string;
}

export interface DemoSeedSummary {
  assignments: SeedResult;
  contributions: SeedResult;
  families: SeedResult;
  operators: SeedResult;
  sponsors: SeedResult;
}

interface SeedResult {
  inserted: number;
  repaired: number;
  skipped: number;
}

interface DemoServices {
  assignments: SupportAssignmentService;
  contributions: ContributionService;
  families: FamilyService;
  operators: OperatorService;
  sponsors: SponsorService;
}

export async function seedDemoData(
  data: DemoSeedData,
  actorUserId: string,
  services: DemoServices,
): Promise<DemoSeedSummary> {
  const identities = demoIdentities(data);
  const existing = await loadExistingAccounts(identities);
  const summary: DemoSeedSummary = {
    assignments: { inserted: 0, repaired: 0, skipped: 0 },
    contributions: { inserted: 0, repaired: 0, skipped: 0 },
    families: { inserted: 0, repaired: 0, skipped: 0 },
    operators: { inserted: 0, repaired: 0, skipped: 0 },
    sponsors: { inserted: 0, repaired: 0, skipped: 0 },
  };

  await seedGroup(
    "operators",
    data.operators,
    existing,
    summary.operators,
    (item) => services.operators.create(item),
  );
  await seedGroup(
    "sponsors",
    data.sponsors,
    existing,
    summary.sponsors,
    (item) => services.sponsors.create(item),
  );
  await seedGroup(
    "families",
    data.families,
    existing,
    summary.families,
    (item) => services.families.create(item, actorUserId),
  );
  await syncDemoAccountImages(data);

  const assignments = await seedAssignments(
    data.assignments,
    actorUserId,
    services.assignments,
    summary.assignments,
  );
  await seedContributions(
    data.contributions,
    assignments,
    actorUserId,
    services.contributions,
    summary.contributions,
  );

  await verifyDemoData(identities, data.families, data.contributions, assignments);
  return summary;
}

async function syncDemoAccountImages(data: DemoSeedData) {
  const accounts = [
    ...data.sponsors,
    ...data.families,
  ];

  for (let offset = 0; offset < accounts.length; offset += 50) {
    await Promise.all(
      accounts.slice(offset, offset + 50).map((account) =>
        db
          .update(usersTable)
          .set({ image: account.image ?? null })
          .where(eq(usersTable.id, account.userId)),
      ),
    );
  }
}

type AssignmentRow = {
  familyProfileId: string;
  id: string;
  sponsorProfileId: string;
};

async function seedAssignments(
  desired: readonly DemoSupportAssignment[],
  actorUserId: string,
  service: SupportAssignmentService,
  result: SeedResult,
): Promise<Map<string, AssignmentRow>> {
  if (desired.length === 0) return new Map();
  const existingRows = await db
    .select({
      id: supportAssignments.id,
      sponsorProfileId: supportAssignments.sponsorProfileId,
      familyProfileId: supportAssignments.familyProfileId,
    })
    .from(supportAssignments)
    .where(
      and(
        inArray(
          supportAssignments.sponsorProfileId,
          desired.map((item) => item.sponsorProfileId),
        ),
        inArray(
          supportAssignments.familyProfileId,
          desired.map((item) => item.familyProfileId),
        ),
        eq(supportAssignments.status, "active"),
        isNull(supportAssignments.childId),
      ),
    );
  const resolved = new Map(
    existingRows.map((row) => [assignmentKey(row), row]),
  );

  for (const [index, item] of desired.entries()) {
    const key = assignmentKey(item);
    if (resolved.has(key)) {
      result.skipped += 1;
    } else {
      const created = await service.create(item, actorUserId);
      resolved.set(key, created!);
      result.inserted += 1;
    }
    logProgress("assignments", index + 1, desired.length);
  }

  return resolved;
}

async function seedContributions(
  desired: readonly DemoContribution[],
  assignments: ReadonlyMap<string, AssignmentRow>,
  actorUserId: string,
  service: ContributionService,
  result: SeedResult,
) {
  if (desired.length === 0) return;
  const references = desired.map((item) => item.externalReference);
  const existingRows = await db
    .select({
      amountMinor: contributions.amountMinor,
      externalReference: contributions.externalReference,
      familyProfileId: contributions.familyProfileId,
      id: contributions.id,
      paymentMethod: contributions.paymentMethod,
      sponsorProfileId: contributions.sponsorProfileId,
      status: contributions.status,
      supportAssignmentId: contributions.supportAssignmentId,
    })
    .from(contributions)
    .where(inArray(contributions.externalReference, references));
  const existingByReference = new Map<string, typeof existingRows>();
  for (const row of existingRows) {
    const reference = row.externalReference!;
    const rows = existingByReference.get(reference) ?? [];
    rows.push(row);
    existingByReference.set(reference, rows);
  }

  for (const [index, item] of desired.entries()) {
    const assignment = assignments.get(assignmentKey(item));
    if (!assignment) {
      throw new Error(
        `Demo contribution '${item.externalReference}' has no active support assignment.`,
      );
    }
    const matches = existingByReference.get(item.externalReference) ?? [];
    if (matches.length > 1) {
      throw new Error(
        `Demo contribution reference '${item.externalReference}' is duplicated.`,
      );
    }
    const existing = matches[0];
    let contributionId: string;
    if (existing) {
      if (contributionMatches(existing, item, assignment)) {
        result.skipped += 1;
        contributionId = existing.id;
      } else {
        await removeManagedContribution(existing, actorUserId, service);
        contributionId = await createManagedContribution(
          item,
          assignment,
          actorUserId,
          service,
        );
        result.repaired += 1;
      }
    } else {
      contributionId = await createManagedContribution(
        item,
        assignment,
        actorUserId,
        service,
      );
      result.inserted += 1;
    }
    await alignManagedContributionTimeline(contributionId, item);
    logProgress("contributions", index + 1, desired.length);
  }
}

async function createManagedContribution(
  item: DemoContribution,
  assignment: AssignmentRow,
  actorUserId: string,
  service: ContributionService,
) {
  const created = await service.record(
    {
      supportAssignmentId: assignment.id,
      amountMinor: item.amountMinor,
      paymentMethod: item.paymentMethod,
      externalReference: item.externalReference,
      paidAt: new Date(`${item.paidAt}T12:00:00.000Z`),
    },
    actorUserId,
  );
  if (item.expectedStatus === "validated") {
    await service.validate(created!.id, actorUserId);
  } else if (item.expectedStatus === "rejected") {
    await service.reject(
      created!.id,
      { reason: "Generated demo contribution rejection." },
      actorUserId,
    );
  }
  return created!.id;
}

async function alignManagedContributionTimeline(
  contributionId: string,
  item: DemoContribution,
) {
  const paidAt = new Date(`${item.paidAt}T12:00:00.000Z`);
  const lifecycleAt = new Date(paidAt.getTime() + 6 * 60 * 60 * 1_000);
  const statusTimestamp =
    item.expectedStatus === "validated"
      ? { validatedAt: lifecycleAt }
      : item.expectedStatus === "rejected"
        ? { rejectedAt: lifecycleAt }
        : {};

  await db
    .update(contributions)
    .set({
      createdAt: paidAt,
      paidAt,
      submittedAt: paidAt,
      updatedAt: lifecycleAt,
      ...statusTimestamp,
    })
    .where(eq(contributions.id, contributionId));

  if (item.expectedStatus === "validated") {
    await db
      .update(budgetLedgerEntries)
      .set({ createdAt: lifecycleAt })
      .where(
        and(
          eq(budgetLedgerEntries.sourceType, "contribution"),
          eq(budgetLedgerEntries.sourceId, contributionId),
        ),
      );
  }
}

async function removeManagedContribution(
  existing: { id: string; status: string },
  actorUserId: string,
  service: ContributionService,
) {
  if (existing.status === "validated") {
    await service.refund(
      existing.id,
      { reason: "Repairing generated demo contribution amount." },
      actorUserId,
    );
  }
  await service.delete(existing.id, actorUserId);
}

function ensureContributionMatches(
  existing: {
    amountMinor: number;
    familyProfileId: string;
    paymentMethod: string;
    sponsorProfileId: string;
    status: string;
    supportAssignmentId: string;
  },
  desired: DemoContribution,
  assignment: AssignmentRow,
) {
  if (!contributionMatches(existing, desired, assignment)) {
    throw new Error(
      `Demo contribution '${desired.externalReference}' conflicts with an existing record.`,
    );
  }
}

function contributionMatches(
  existing: {
    amountMinor: number;
    familyProfileId: string;
    paymentMethod: string;
    sponsorProfileId: string;
    status: string;
    supportAssignmentId: string;
  },
  desired: DemoContribution,
  assignment: AssignmentRow,
) {
  return (
    existing.amountMinor !== desired.amountMinor ||
    existing.familyProfileId !== desired.familyProfileId ||
    existing.paymentMethod !== desired.paymentMethod ||
    existing.sponsorProfileId !== desired.sponsorProfileId ||
    existing.status !== desired.expectedStatus ||
    existing.supportAssignmentId !== assignment.id
  ) === false;
}

function assignmentKey(item: {
  familyProfileId: string;
  sponsorProfileId: string;
}) {
  return `${item.sponsorProfileId}:${item.familyProfileId}`;
}

function logProgress(label: string, processed: number, total: number) {
  if (processed === total || processed % 10 === 0) {
    console.log(`  ${label}: ${processed}/${total}`);
  }
}

async function seedGroup<T extends { email: string }>(
  label: keyof DemoSeedSummary,
  items: readonly T[],
  existing: ReadonlySet<string>,
  result: SeedResult,
  create: (item: T) => Promise<unknown>,
) {
  for (const [index, item] of items.entries()) {
    if (existing.has(item.email)) {
      result.skipped += 1;
    } else {
      await create(item);
      result.inserted += 1;
    }

    const processed = index + 1;
    if (processed === items.length || processed % 10 === 0) {
      console.log(`  ${label}: ${processed}/${items.length}`);
    }
  }
}

async function loadExistingAccounts(
  identities: readonly DemoAccountIdentity[],
): Promise<Set<string>> {
  if (identities.length === 0) return new Set();

  const emails = identities.map((identity) => identity.email);
  const userIds = identities.map((identity) => identity.userId);
  const profileIds = identities.map((identity) => identity.id);
  const [users, operators, sponsors, families] = await Promise.all([
    db
      .select({
        email: usersTable.email,
        id: usersTable.id,
        role: rolesTable.name,
      })
      .from(usersTable)
      .innerJoin(rolesTable, eq(rolesTable.id, usersTable.roleId))
      .where(or(inArray(usersTable.email, emails), inArray(usersTable.id, userIds))),
    db
      .select({ id: operatorProfiles.id, userId: operatorProfiles.userId })
      .from(operatorProfiles)
      .where(
        or(
          inArray(operatorProfiles.id, profileIds),
          inArray(operatorProfiles.userId, userIds),
        ),
      ),
    db
      .select({ id: sponsorProfiles.id, userId: sponsorProfiles.userId })
      .from(sponsorProfiles)
      .where(
        or(
          inArray(sponsorProfiles.id, profileIds),
          inArray(sponsorProfiles.userId, userIds),
        ),
      ),
    db
      .select({ id: familyProfiles.id, userId: familyProfiles.userId })
      .from(familyProfiles)
      .where(
        or(
          inArray(familyProfiles.id, profileIds),
          inArray(familyProfiles.userId, userIds),
        ),
      ),
  ]);

  const usersByEmail = new Map(users.map((user) => [user.email, user]));
  const usersById = new Map(users.map((user) => [user.id, user]));
  const profilesByKind = {
    operator: indexProfiles(operators),
    sponsor: indexProfiles(sponsors),
    family: indexProfiles(families),
  };
  const existing = new Set<string>();

  for (const identity of identities) {
    const userByEmail = usersByEmail.get(identity.email);
    const userById = usersById.get(identity.userId);
    const profiles = profilesByKind[identity.kind];
    const profileById = profiles.byId.get(identity.id);
    const profileByUserId = profiles.byUserId.get(identity.userId);
    const noRecord =
      !userByEmail && !userById && !profileById && !profileByUserId;

    if (noRecord) continue;
    if (
      userByEmail?.id === identity.userId &&
      userById?.email === identity.email &&
      userByEmail.role === identity.role &&
      profileById?.userId === identity.userId &&
      profileByUserId?.id === identity.id
    ) {
      existing.add(identity.email);
      continue;
    }

    throw new Error(
      `Demo ${identity.kind} '${identity.email}' conflicts with an existing or partial account.`,
    );
  }

  return existing;
}

function indexProfiles(rows: Array<{ id: string; userId: string }>) {
  return {
    byId: new Map(rows.map((profile) => [profile.id, profile])),
    byUserId: new Map(rows.map((profile) => [profile.userId, profile])),
  };
}

function demoIdentities(data: DemoSeedData): DemoAccountIdentity[] {
  return [
    ...data.operators.map((item) => identity("operator", item)),
    ...data.sponsors.map((item) => identity("sponsor", item)),
    ...data.families.map((item) => identity("family", item)),
  ];
}

function identity(
  kind: DemoKind,
  item: DemoOperator | DemoSponsor | DemoFamily,
): DemoAccountIdentity {
  return {
    email: item.email,
    id: item.id,
    kind,
    role: kind,
    userId: item.userId,
  };
}

async function verifyDemoData(
  identities: readonly DemoAccountIdentity[],
  families: readonly DemoFamily[],
  desiredContributions: readonly DemoContribution[],
  assignments: ReadonlyMap<string, AssignmentRow>,
) {
  const existing = await loadExistingAccounts(identities);
  const managedContributionReferences = desiredContributions.map(
    (item) => item.externalReference,
  );
  if (existing.size !== identities.length) {
    throw new Error(
      `Demo verification expected ${identities.length} accounts, found ${existing.size}.`,
    );
  }

  if (families.length > 0) {
    const childCounts = await db
      .select({
        familyProfileId: children.familyProfileId,
        total: count(),
      })
      .from(children)
      .where(inArray(children.familyProfileId, families.map((family) => family.id)))
      .groupBy(children.familyProfileId);
    const countsByFamily = new Map(
      childCounts.map((row) => [row.familyProfileId, row.total]),
    );

    for (const family of families) {
      const actual = countsByFamily.get(family.id) ?? 0;
      if (actual < family.initialChildren.length) {
        throw new Error(
          `Demo family '${family.email}' expected at least ${family.initialChildren.length} children, found ${actual}.`,
        );
      }
    }

    const fundingRows = await db
      .select({
        familyProfileId: familyProfiles.id,
        targetMinor: familyProfiles.fundingTargetMinor,
        validatedMinor: sum(contributions.amountMinor).mapWith(Number),
      })
      .from(familyProfiles)
      .leftJoin(
        contributions,
        and(
          eq(contributions.familyProfileId, familyProfiles.id),
          eq(contributions.status, "validated"),
          inArray(
            contributions.externalReference,
            managedContributionReferences,
          ),
        ),
      )
      .where(inArray(familyProfiles.id, families.map((family) => family.id)))
      .groupBy(familyProfiles.id, familyProfiles.fundingTargetMinor);
    const exceeded = fundingRows.filter(
      (row) => (row.validatedMinor ?? 0) > row.targetMinor,
    );
    if (exceeded.length > 0) {
      throw new Error(
        `${exceeded.length} demo families have validated contributions above their funding target.`,
      );
    }
    const maximumPercent = Math.max(
      0,
      ...fundingRows.map((row) =>
        Math.round(
          ((row.validatedMinor ?? 0) / row.targetMinor) * 10_000,
        ) / 100,
      ),
    );
    console.log(
      `  funding caps: ${fundingRows.length} families verified, 0 exceeded, maximum ${maximumPercent}%.`,
    );
  }

  if (desiredContributions.length === 0) return;
  const contributionRows = await db
    .select({
      amountMinor: contributions.amountMinor,
      externalReference: contributions.externalReference,
      familyProfileId: contributions.familyProfileId,
      paymentMethod: contributions.paymentMethod,
      paidAt: contributions.paidAt,
      sponsorProfileId: contributions.sponsorProfileId,
      status: contributions.status,
      submittedAt: contributions.submittedAt,
      supportAssignmentId: contributions.supportAssignmentId,
      validatedAt: contributions.validatedAt,
    })
    .from(contributions)
    .where(
      inArray(
        contributions.externalReference,
        desiredContributions.map((item) => item.externalReference),
      ),
    );
  const rowsByReference = new Map(
    contributionRows.map((row) => [row.externalReference, row]),
  );

  for (const desired of desiredContributions) {
    const existing = rowsByReference.get(desired.externalReference);
    const assignment = assignments.get(assignmentKey(desired));
    if (!existing || !assignment) {
      throw new Error(
        `Demo contribution '${desired.externalReference}' was not found after seeding.`,
      );
    }
    ensureContributionMatches(existing, desired, assignment);
    const paidOn = existing.paidAt?.toISOString().slice(0, 10);
    const submittedOn = existing.submittedAt.toISOString().slice(0, 10);
    if (paidOn !== desired.paidAt || submittedOn !== desired.paidAt) {
      throw new Error(
        `Demo contribution '${desired.externalReference}' has an incorrect historical timeline.`,
      );
    }
    if (desired.expectedStatus === "validated" && !existing.validatedAt) {
      throw new Error(
        `Demo contribution '${desired.externalReference}' is missing its validation timestamp.`,
      );
    }
  }
}
