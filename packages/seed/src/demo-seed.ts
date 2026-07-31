import {
  ContributionService,
  FamilyService,
  SponsorService,
  StaffService,
  SupportAssignmentService,
} from "@kafil/server/modules";
import {
  budgetLedgerEntries,
  children,
  contributions,
  db,
  familyProfiles,
  rolesTable,
  sponsorProfiles,
  staffFunctions,
  staffProfiles,
  supportAssignments,
  usersTable,
} from "@kafil/server/database";
import { and, asc, count, eq, inArray, isNull, or, sql } from "drizzle-orm";

import type {
  DemoContribution,
  DemoDelivery,
  DemoFamily,
  DemoOperator,
  DemoSeedData,
  DemoSponsor,
  DemoSupportAssignment,
} from "./scripts/demo/generator";
import { familyIntakeNeedsRepair } from "./scripts/demo/familyRepair";

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
  deliveries: SeedResult;
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
  operators: StaffService;
  sponsors: SponsorService;
}

export async function seedDemoData(
  data: DemoSeedData,
  actorUserId: string,
  services: DemoServices,
  expiresAt: Date = new Date(Date.now() + 72 * 60 * 60 * 1000),
): Promise<DemoSeedSummary> {
  const identities = demoIdentities(data);
  const existing = await loadExistingAccounts(identities);
  const summary: DemoSeedSummary = {
    assignments: { inserted: 0, repaired: 0, skipped: 0 },
    contributions: { inserted: 0, repaired: 0, skipped: 0 },
    deliveries: { inserted: 0, repaired: 0, skipped: 0 },
    families: { inserted: 0, repaired: 0, skipped: 0 },
    operators: { inserted: 0, repaired: 0, skipped: 0 },
    sponsors: { inserted: 0, repaired: 0, skipped: 0 },
  };

  await seedDeliveryGroup(
    data.deliveries,
    services.operators,
    actorUserId,
    summary.deliveries,
  );
  await seedGroup(
    "operators",
    data.operators,
    existing,
    summary.operators,
    (item) =>
      services.operators.createWithUserId(
        {
          ...item,
          contactEmail: item.email,
          affiliation: "internal",
          functions: ["operator"],
          createOperatorAccess: true,
          createOperatorAccessEmail: item.email,
        },
        actorUserId,
      ),
  );
  await seedGroup(
    "sponsors",
    data.sponsors,
    existing,
    summary.sponsors,
    (item) => services.sponsors.create(item),
  );
  await seedFamilyGroup(
    data.families,
    existing,
    services,
    actorUserId,
    summary.families,
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
    expiresAt,
  );
  await verifyDemoData(identities, data.families, data.contributions, assignments);
  await verifyDemoDeliveries(data.deliveries);
  return summary;
}

async function syncDemoAccountImages(data: DemoSeedData) {
  const accounts = [
    ...data.sponsors,
    ...data.families,
  ];

  for (let offset = 0; offset < accounts.length; offset += 50) {
    await Promise.all(
      accounts.slice(offset, offset + 50).map(async (account) => {
        if (!account.image) {
          const [current] = await db
            .select({ image: usersTable.image })
            .from(usersTable)
            .where(eq(usersTable.id, account.userId))
            .limit(1);
          if (current?.image) return;
        }
        await db
          .update(usersTable)
          .set({ image: account.image ?? null })
          .where(eq(usersTable.id, account.userId));
      }),
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
  expiresAt: Date,
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
    await alignManagedContributionTimeline(contributionId, item, expiresAt);
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
  } else if (item.expectedStatus === "expired") {
    await db
      .update(contributions)
      .set({ expiresAt: new Date(0) })
      .where(eq(contributions.id, created!.id));
    await service.expireDue(new Date(), 100);
  }
  return created!.id;
}

async function alignManagedContributionTimeline(
  contributionId: string,
  item: DemoContribution,
  expiresAt: Date,
) {
  const paidAt = new Date(`${item.paidAt}T12:00:00.000Z`);
  const lifecycleAt = new Date(paidAt.getTime() + 6 * 60 * 60 * 1_000);
  const statusTimestamp =
    item.expectedStatus === "validated"
      ? { validatedAt: lifecycleAt }
      : item.expectedStatus === "rejected"
        ? { rejectedAt: lifecycleAt }
        : item.expectedStatus === "expired"
          ? { expiresAt: paidAt, expiredAt: lifecycleAt }
        : {};

  await db
    .update(contributions)
    .set({
      createdAt: paidAt,
      paidAt,
      submittedAt: paidAt,
      updatedAt: lifecycleAt,
      expiresAt: item.expectedStatus === "expired" ? paidAt : expiresAt,
      expiredAt: item.expectedStatus === "expired" ? lifecycleAt : null,
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

async function seedDeliveryGroup(
  items: readonly DemoDelivery[],
  service: StaffService,
  actorUserId: string,
  result: SeedResult,
) {
  if (items.length === 0) return;
  const rows = await db
    .select({
      address: staffProfiles.address,
      affiliation: staffProfiles.affiliation,
      cin: staffProfiles.cin,
      contactEmail: staffProfiles.contactEmail,
      dateOfBirth: staffProfiles.dateOfBirth,
      functionKey: staffFunctions.functionKey,
      gender: staffProfiles.gender,
      id: staffProfiles.id,
      jobTitle: staffProfiles.jobTitle,
      name: staffProfiles.name,
      notes: staffProfiles.notes,
      phone: staffProfiles.phone,
      status: staffProfiles.status,
    })
    .from(staffProfiles)
    .leftJoin(
      staffFunctions,
      eq(staffFunctions.staffProfileId, staffProfiles.id),
    )
    .where(
      or(
        inArray(
          staffProfiles.id,
          items.map((item) => item.id),
        ),
        inArray(
          staffProfiles.contactEmail,
          items.map((item) => item.contactEmail),
        ),
        inArray(
          staffProfiles.phone,
          items.map((item) => item.phone),
        ),
      ),
    );
  const rowsById = new Map<string, typeof rows>();
  for (const row of rows) {
    const grouped = rowsById.get(row.id) ?? [];
    grouped.push(row);
    rowsById.set(row.id, grouped);
  }

  for (const [index, item] of items.entries()) {
    const conflicts = rows.filter(
      (row) =>
        row.id !== item.id &&
        (row.contactEmail === item.contactEmail || row.phone === item.phone),
    );
    if (conflicts.length > 0) {
      throw new Error(
        `Demo delivery staff '${item.contactEmail}' conflicts with an existing staff record.`,
      );
    }
    const matches = rowsById.get(item.id) ?? [];
    const stored = matches[0];
    const desired = {
      address: item.address,
      affiliation: "internal" as const,
      cin: item.cin,
      companyName: null,
      contactEmail: item.contactEmail,
      dateOfBirth: item.dateOfBirth,
      functions: ["delivery"],
      gender: item.gender,
      image: null,
      jobTitle: item.jobTitle,
      name: item.name,
      notes: item.notes,
      phone: item.phone,
    };

    if (!stored) {
      await service.create({ id: item.id, ...desired }, actorUserId);
      result.inserted += 1;
    } else {
      const functionKeys = new Set(
        matches
          .map((row) => row.functionKey)
          .filter((key): key is string => key !== null),
      );
      const needsRepair =
        stored.address !== item.address ||
        stored.affiliation !== "internal" ||
        stored.cin !== item.cin ||
        stored.contactEmail !== item.contactEmail ||
        stored.dateOfBirth !== item.dateOfBirth ||
        stored.gender !== item.gender ||
        stored.jobTitle !== item.jobTitle ||
        stored.name !== item.name ||
        stored.notes !== item.notes ||
        stored.phone !== item.phone ||
        functionKeys.size !== 1 ||
        !functionKeys.has("delivery");
      if (needsRepair) {
        await service.update(item.id, desired, actorUserId);
      }
      if (stored.status !== "active") {
        await service.reactivate(
          item.id,
          { reason: "Restore the managed demo delivery fixture." },
          actorUserId,
        );
      }
      if (needsRepair || stored.status !== "active") result.repaired += 1;
      else result.skipped += 1;
    }
    logProgress("deliveries", index + 1, items.length);
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

async function seedFamilyGroup(
  items: readonly DemoFamily[],
  existing: ReadonlySet<string>,
  services: DemoServices,
  actorUserId: string,
  result: SeedResult,
) {
  const profileIds = items.map((family) => family.id);
  const storedRows = profileIds.length
    ? await db
        .select({
          housingSituation: familyProfiles.housingSituation,
          id: familyProfiles.id,
          registrationDate: familyProfiles.registrationDate,
          supportPriority: familyProfiles.supportPriority,
        })
        .from(familyProfiles)
        .where(inArray(familyProfiles.id, profileIds))
    : [];
  const storedById = new Map(storedRows.map((row) => [row.id, row]));
  const desiredChildImages = collectDesiredChildImages(items);

  for (const [index, family] of items.entries()) {
    if (existing.has(family.email)) {
      const stored = storedById.get(family.id);
      if (familyIntakeNeedsRepair(family, stored)) {
        await services.families.update(
          family.id,
          {
            housingSituation: family.housingSituation,
            registrationDate: family.registrationDate,
            supportPriority: family.supportPriority,
          },
          actorUserId,
        );
        result.repaired += 1;
      } else {
        result.skipped += 1;
      }
    } else {
      await services.families.create(family, actorUserId);
      result.inserted += 1;
    }

    await alignExistingChildImages(family, desiredChildImages);

    const processed = index + 1;
    if (processed === items.length || processed % 10 === 0) {
      console.log(`  families: ${processed}/${items.length}`);
    }
  }
}

function collectDesiredChildImages(items: readonly DemoFamily[]) {
  const map = new Map<string, { childIndex: number; image: string | null }>();
  for (const family of items) {
    family.initialChildren.forEach((child, childIndex) => {
      map.set(`${family.id}:${childIndex}`, {
        childIndex,
        image: child.image ?? null,
      });
    });
  }
  return map;
}

async function alignExistingChildImages(
  family: DemoFamily,
  desiredImages: ReadonlyMap<string, { childIndex: number; image: string | null }>,
) {
  const familyKey = family.id;
  const rows = await db
    .select({
      createdAt: children.createdAt,
      id: children.id,
      image: children.image,
    })
    .from(children)
    .where(eq(children.familyProfileId, familyKey))
    .orderBy(asc(children.createdAt));

  for (const [offset, row] of rows.entries()) {
    const desired = desiredImages.get(`${familyKey}:${offset}`);
    if (!desired) continue;
    if (desired.image) {
      if (row.image !== desired.image) {
        await db
          .update(children)
          .set({ image: desired.image, updatedAt: new Date() })
          .where(eq(children.id, row.id));
      }
      continue;
    }
    if (row.image) continue;
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
      .select({ id: staffProfiles.id, userId: staffProfiles.userId })
      .from(staffProfiles)
      .innerJoin(
        staffFunctions,
        and(
          eq(staffFunctions.staffProfileId, staffProfiles.id),
          eq(staffFunctions.functionKey, "operator"),
        ),
      )
      .where(
        or(
          inArray(staffProfiles.id, profileIds),
          inArray(staffProfiles.userId, userIds),
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

function indexProfiles(
  rows: Array<{ id: string; userId: string | null }>,
) {
  return {
    byId: new Map(rows.map((profile) => [profile.id, profile])),
    byUserId: new Map(
      rows
        .filter(
          (profile): profile is { id: string; userId: string } =>
            profile.userId !== null,
        )
        .map((profile) => [profile.userId, profile]),
    ),
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

    const childImageRows = await db
      .select({
        familyProfileId: children.familyProfileId,
        id: children.id,
        image: children.image,
      })
      .from(children)
      .where(inArray(children.familyProfileId, families.map((family) => family.id)))
      .orderBy(asc(children.familyProfileId), asc(children.createdAt));
    const childrenByFamily = new Map<string, Array<{ id: string; image: string | null }>>();
    for (const row of childImageRows) {
      const list = childrenByFamily.get(row.familyProfileId) ?? [];
      list.push({ id: row.id, image: row.image });
      childrenByFamily.set(row.familyProfileId, list);
    }

    const familyRows = await db
      .select({
        id: familyProfiles.id,
        housingSituation: familyProfiles.housingSituation,
        registrationDate: familyProfiles.registrationDate,
        supportPriority: familyProfiles.supportPriority,
      })
      .from(familyProfiles)
      .where(inArray(familyProfiles.id, families.map((family) => family.id)));
    const familyRowsById = new Map(familyRows.map((row) => [row.id, row]));

    for (const family of families) {
      const actual = countsByFamily.get(family.id) ?? 0;
      if (actual < family.initialChildren.length) {
        throw new Error(
          `Demo family '${family.email}' expected at least ${family.initialChildren.length} children, found ${actual}.`,
        );
      }
      const stored = familyRowsById.get(family.id);
      if (
        !stored ||
        stored.housingSituation !== family.housingSituation ||
        stored.registrationDate !== family.registrationDate ||
        stored.supportPriority !== family.supportPriority
      ) {
        throw new Error(
          `Demo family '${family.email}' has incorrect household intake fields after seeding.`,
        );
      }
      const existingChildren = childrenByFamily.get(family.id) ?? [];
      family.initialChildren.forEach((desired, childIndex) => {
        const stored = existingChildren[childIndex];
        if (!stored) return;
        if (desired.image && stored.image !== desired.image) {
          throw new Error(
            `Demo family '${family.email}' child ${childIndex} image is '${stored.image ?? "null"}', expected '${desired.image}'.`,
          );
        }
      });
    }

    const verificationNow = new Date();
    const fundingRows = await db
      .select({
        familyProfileId: familyProfiles.id,
        targetMinor: familyProfiles.fundingTargetMinor,
        validatedMinor:
          sql<number>`coalesce(sum(${contributions.amountMinor}) filter (where ${contributions.status} = 'validated'), 0)::bigint`.mapWith(
            Number,
          ),
        livePendingMinor:
          sql<number>`coalesce(sum(${contributions.amountMinor}) filter (where ${contributions.status} = 'pending' AND ${contributions.expiresAt} > ${verificationNow}), 0)::bigint`.mapWith(
            Number,
          ),
        livePendingCount:
          sql<number>`count(*) filter (where ${contributions.status} = 'pending' AND ${contributions.expiresAt} > ${verificationNow})::int`.mapWith(
            Number,
          ),
        expiredCount:
          sql<number>`count(*) filter (where ${contributions.status} = 'expired')::int`.mapWith(
            Number,
          ),
      })
      .from(familyProfiles)
      .leftJoin(
        contributions,
        and(
          eq(contributions.familyProfileId, familyProfiles.id),
          inArray(
            contributions.externalReference,
            managedContributionReferences,
          ),
        ),
      )
      .where(inArray(familyProfiles.id, families.map((family) => family.id)))
      .groupBy(familyProfiles.id, familyProfiles.fundingTargetMinor);
    const exceeded = fundingRows.filter(
      (row) =>
        row.validatedMinor + row.livePendingMinor > row.targetMinor,
    );
    if (exceeded.length > 0) {
      throw new Error(
        `${exceeded.length} demo families have validated plus live pending contributions above their funding target.`,
      );
    }
    const maximumPercent = Math.max(
      0,
      ...fundingRows.map((row) =>
        Math.round(
          (row.validatedMinor / row.targetMinor) * 10_000,
        ) / 100,
      ),
    );
    console.log(
      `  funding caps: ${fundingRows.length} families verified, 0 exceeded, maximum ${maximumPercent}%; ${fundingRows.reduce((total, row) => total + row.livePendingCount, 0)} live pending and ${fundingRows.reduce((total, row) => total + row.expiredCount, 0)} expired.`,
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

async function verifyDemoDeliveries(items: readonly DemoDelivery[]) {
  if (items.length === 0) return;
  const rows = await db
    .select({
      id: staffProfiles.id,
      functionKey: staffFunctions.functionKey,
      status: staffProfiles.status,
    })
    .from(staffProfiles)
    .innerJoin(
      staffFunctions,
      eq(staffFunctions.staffProfileId, staffProfiles.id),
    )
    .where(
      and(
        inArray(
          staffProfiles.id,
          items.map((item) => item.id),
        ),
        eq(staffFunctions.functionKey, "delivery"),
      ),
    );
  if (
    rows.length !== items.length ||
    rows.some((row) => row.status !== "active")
  ) {
    throw new Error(
      `Demo verification expected ${items.length} active delivery staff, found ${rows.length}.`,
    );
  }
}
