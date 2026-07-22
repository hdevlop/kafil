import { faker } from "@faker-js/faker";

import {
  moroccanFirstName,
  moroccanNameParts,
} from "../../fakers/moroccan-names";
import type { MoroccanNameParts } from "../../fakers/moroccan-names";

export interface DemoSeedCounts {
  contributions: number;
  families: number;
  operators: number;
  sponsors: number;
}

export interface DemoPersonAccount {
  address: string;
  cin: string;
  dateOfBirth: string;
  email: string;
  gender: "F" | "M";
  id: string;
  image?: string | null;
  name: string;
  notes: string;
  phone: string;
  userId: string;
}

export interface DemoOperator extends DemoPersonAccount {
  jobTitle: string;
}

export type DemoSponsor = DemoPersonAccount;

export interface DemoChild {
  clothingSize: string;
  dateOfBirth: string;
  gender: "F" | "M";
  legalName: string;
  notes: string;
  schoolLevel: string;
  shoeSize: string;
}

export interface DemoFamily {
  email: string;
  exactAddress: string;
  fundingTargetMinor: number;
  guardianCin: string;
  guardianDateOfBirth: string;
  id: string;
  image?: string | null;
  initialChildren: DemoChild[];
  name: string;
  notes: string;
  phone: string;
  relationshipToChildren: string;
  userId: string;
}

export interface DemoSupportAssignment {
  familyProfileId: string;
  notes: string;
  sponsorProfileId: string;
}

export interface DemoContribution {
  amountMinor: number;
  expectedStatus: "pending" | "rejected" | "validated";
  externalReference: string;
  familyProfileId: string;
  paidAt: string;
  paymentMethod: string;
  sponsorProfileId: string;
}

export interface DemoSeedData {
  assignments: DemoSupportAssignment[];
  contributions: DemoContribution[];
  families: DemoFamily[];
  operators: DemoOperator[];
  sponsors: DemoSponsor[];
}

type DemoFamilyFundingState = "full" | "pending" | "zero";

interface DemoFamilyFundingPlan {
  family: DemoFamily;
  state: DemoFamilyFundingState;
  targetMinor: number;
}

export const DEFAULT_DEMO_SEED_COUNTS: Readonly<DemoSeedCounts> = {
  contributions: 100,
  families: 20,
  operators: 5,
  sponsors: 50,
};

const DEMO_FAKER_SEED = 20_260_719;
const FAMILY_FUNDING_RATIOS = {
  full: 0.3,
  pending: 0.5,
  zero: 0.2,
} as const satisfies Record<DemoFamilyFundingState, number>;
const CITIES = [
  "Agadir",
  "Casablanca",
  "Fes",
  "Marrakech",
  "Rabat",
  "Tangier",
] as const;
const STREETS = [
  "Avenue Hassan II",
  "Avenue Mohammed V",
  "Boulevard Anfa",
  "Boulevard Zerktouni",
  "Rue Ibn Sina",
] as const;
const SCHOOL_LEVELS = [
  "Preschool",
  "Primary",
  "Middle school",
  "Secondary school",
] as const;
const CLOTHING_SIZES = ["6 years", "8 years", "10 years", "12 years"] as const;
const JOB_TITLES = [
  "Family coordinator",
  "Field operator",
  "Programme officer",
  "Social worker",
] as const;

export function readDemoSeedCounts(
  args: readonly string[] = process.argv.slice(2).filter((arg) => arg !== "--"),
): DemoSeedCounts {
  return {
    contributions: readCount(
      args,
      "contributions",
      "c",
      DEFAULT_DEMO_SEED_COUNTS.contributions,
    ),
    families: readCount(args, "families", "f", DEFAULT_DEMO_SEED_COUNTS.families),
    operators: readCount(args, "operators", "o", DEFAULT_DEMO_SEED_COUNTS.operators),
    sponsors: readCount(args, "sponsors", "s", DEFAULT_DEMO_SEED_COUNTS.sponsors),
  };
}

export function generateDemoSeedData(
  counts: DemoSeedCounts = { ...DEFAULT_DEMO_SEED_COUNTS },
  referenceDate: Date = new Date(),
): DemoSeedData {
  validateCounts(counts);
  if (Number.isNaN(referenceDate.getTime())) {
    throw new Error("referenceDate must be a valid date.");
  }
  faker.seed(DEMO_FAKER_SEED);
  const adultName = uniqueAdultNameGenerator();

  const operators = Array.from({ length: counts.operators }, (_, index) =>
    operator(index, adultName),
  );
  const sponsors = Array.from({ length: counts.sponsors }, (_, index) =>
    sponsor(index, adultName),
  );
  const families = Array.from({ length: counts.families }, (_, index) =>
    family(index, adultName),
  );
  const assignments = generateAssignments(sponsors, families);

  if (counts.contributions > 0 && assignments.length === 0) {
    throw new Error(
      "Contributions require at least one sponsor and one family. Set --contributions=0 or increase both account counts.",
    );
  }
  const contributions = generateContributions(
    counts.contributions,
    assignments,
    families,
    referenceDate,
  );

  return {
    assignments,
    contributions,
    families,
    operators,
    sponsors,
  };
}

function generateContributions(
  count: number,
  assignments: readonly DemoSupportAssignment[],
  families: readonly DemoFamily[],
  referenceDate: Date,
) {
  const fundingPlans = familyFundingPlans(families);
  const activeFundingPlans = fundingPlans
    .filter((plan) => plan.state !== "zero")
    .slice(0, count);
  const statuses = contributionStatuses(count, activeFundingPlans.length);
  const assignmentsByFamilyId = new Map<string, DemoSupportAssignment>();

  for (const assignment of assignments) {
    if (!assignmentsByFamilyId.has(assignment.familyProfileId)) {
      assignmentsByFamilyId.set(assignment.familyProfileId, assignment);
    }
  }

  let validatedIndex = 0;
  const contributionPlans = statuses.map((expectedStatus, index) => {
    if (expectedStatus !== "validated") {
      return {
        assignment: assignments[index % assignments.length]!,
        expectedStatus,
      };
    }

    const fundingPlan = activeFundingPlans[
      validatedIndex % activeFundingPlans.length
    ]!;
    validatedIndex += 1;
    return {
      assignment: assignmentsByFamilyId.get(fundingPlan.family.id)!,
      expectedStatus,
    };
  });
  const validatedRemaining = new Map<string, number>();
  const fundingRemaining = new Map(
    activeFundingPlans.map((plan) => [plan.family.id, plan.targetMinor]),
  );

  for (const plan of contributionPlans) {
    if (plan.expectedStatus !== "validated") continue;
    const familyId = plan.assignment.familyProfileId;
    validatedRemaining.set(
      familyId,
      (validatedRemaining.get(familyId) ?? 0) + 1,
    );
  }

  return Array.from({ length: count }, (_, index) => {
    const { assignment, expectedStatus } = contributionPlans[index]!;
    let amountMinor = 50_000 + (index % 5) * 25_000;

    if (expectedStatus === "validated") {
      const familyId = assignment.familyProfileId;
      const contributionCount = validatedRemaining.get(familyId)!;
      const remaining = fundingRemaining.get(familyId)!;
      amountMinor =
        contributionCount === 1
          ? remaining
          : Math.min(
              Math.max(1, Math.floor(remaining / 2)),
              remaining - (contributionCount - 1),
            );
      validatedRemaining.set(familyId, contributionCount - 1);
      fundingRemaining.set(familyId, remaining - amountMinor);
    }

    return contribution(
      index,
      assignment,
      expectedStatus,
      amountMinor,
      referenceDate,
    );
  });
}

function generateAssignments(
  sponsors: readonly DemoSponsor[],
  families: readonly DemoFamily[],
): DemoSupportAssignment[] {
  if (families.length === 0 || sponsors.length === 0) return [];

  return Array.from(
    { length: Math.max(sponsors.length, families.length) },
    (_, index) => ({
      sponsorProfileId: sponsors[index % sponsors.length]!.id,
      familyProfileId: families[index % families.length]!.id,
      notes: "Generated Kafil demo support relationship.",
    }),
  );
}

function familyFundingPlans(
  families: readonly DemoFamily[],
): DemoFamilyFundingPlan[] {
  const counts = apportionedFundingCounts(families.length);

  return families.map((family, index) => {
    if (index < counts.full) {
      return { family, state: "full", targetMinor: family.fundingTargetMinor };
    }
    if (index < counts.full + counts.pending) {
      const pendingIndex = index - counts.full;
      const percentage = 40 + (pendingIndex % 4) * 10;
      return {
        family,
        state: "pending",
        targetMinor: Math.floor((family.fundingTargetMinor * percentage) / 100),
      };
    }
    return { family, state: "zero", targetMinor: 0 };
  });
}

function apportionedFundingCounts(familyCount: number) {
  const states = Object.entries(FAMILY_FUNDING_RATIOS).map(
    ([state, ratio], index) => {
      const exact = familyCount * ratio;
      return {
        count: Math.floor(exact),
        index,
        remainder: exact - Math.floor(exact),
        state: state as DemoFamilyFundingState,
      };
    },
  );
  let unassigned =
    familyCount - states.reduce((total, item) => total + item.count, 0);

  for (const item of [...states].sort(
    (left, right) =>
      right.remainder - left.remainder || left.index - right.index,
  )) {
    if (unassigned === 0) break;
    item.count += 1;
    unassigned -= 1;
  }

  return Object.fromEntries(
    states.map((item) => [item.state, item.count]),
  ) as Record<DemoFamilyFundingState, number>;
}

function contributionStatuses(count: number, requiredValidated: number) {
  const statuses = Array.from({ length: count }, (_, index) =>
    contributionStatus(index),
  );
  let validated = statuses.filter((status) => status === "validated").length;

  for (let index = 0; validated < requiredValidated; index += 1) {
    if (statuses[index] === "validated") continue;
    statuses[index] = "validated";
    validated += 1;
  }

  return statuses;
}

function contribution(
  index: number,
  assignment: DemoSupportAssignment,
  expectedStatus: DemoContribution["expectedStatus"],
  amountMinor: number,
  referenceDate: Date,
): DemoContribution {
  return {
    sponsorProfileId: assignment.sponsorProfileId,
    familyProfileId: assignment.familyProfileId,
    amountMinor,
    paymentMethod: ["bank_transfer", "cash", "card"][index % 3]!,
    externalReference: `KAFIL-DEMO-${String(index + 1).padStart(5, "0")}`,
    paidAt: contributionPaidDate(index, referenceDate),
    expectedStatus,
  };
}

function contributionPaidDate(index: number, referenceDate: Date) {
  const monthOffset = 11 - (index % 12);
  const month = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth() - monthOffset,
      1,
    ),
  );
  const daysInMonth = new Date(
    Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const isCurrentMonth =
    month.getUTCFullYear() === referenceDate.getUTCFullYear() &&
    month.getUTCMonth() === referenceDate.getUTCMonth();
  const latestDay = isCurrentMonth
    ? Math.min(daysInMonth, referenceDate.getUTCDate())
    : daysInMonth;
  const day = Math.min(1 + ((index * 3) % 27), latestDay);

  return `${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function contributionStatus(
  index: number,
): DemoContribution["expectedStatus"] {
  const lifecycle = index % 10;
  return lifecycle === 0
    ? "rejected"
    : lifecycle <= 2
      ? "pending"
      : "validated";
}

function operator(index: number, adultName: AdultNameGenerator): DemoOperator {
  const gender = alternatingGender(index);
  const name = adultName(gender).fullName;
  return {
    id: stableUuid(101, index),
    userId: stableUuid(102, index),
    name,
    email: seedEmail("operator", index),
    phone: seedPhone(10, index),
    cin: seedCin("OP", index),
    gender,
    address: moroccanAddress(),
    dateOfBirth: adultBirthDate(index),
    jobTitle: pick(JOB_TITLES),
    notes: "Generated Kafil demo operator.",
  };
}

function sponsor(index: number, adultName: AdultNameGenerator): DemoSponsor {
  const gender = alternatingGender(index + 1);
  const name = adultName(gender).fullName;
  return {
    id: stableUuid(201, index),
    userId: stableUuid(202, index),
    name,
    email: seedEmail("sponsor", index),
    phone: seedPhone(20, index),
    cin: seedCin("SP", index),
    gender,
    address: moroccanAddress(),
    dateOfBirth: adultBirthDate(index + 7),
    notes: "Generated Kafil demo sponsor.",
  };
}

function family(index: number, adultName: AdultNameGenerator): DemoFamily {
  const guardianGender = alternatingGender(index);
  const guardianName = adultName(guardianGender);
  const childCount = 1 + (index % 3);

  return {
    id: stableUuid(301, index),
    userId: stableUuid(302, index),
    name: guardianName.fullName,
    email: seedEmail("family", index),
    guardianCin: seedCin("FM", index),
    guardianDateOfBirth: adultBirthDate(index + 19),
    exactAddress: moroccanAddress(),
    phone: seedPhone(30, index),
    relationshipToChildren: guardianGender === "F" ? "Mother" : "Father",
    notes: "Generated Kafil demo family.",
    fundingTargetMinor: 700_000 + (index % 5) * 50_000,
    initialChildren: Array.from({ length: childCount }, (_, childIndex) =>
      child(index, childIndex, guardianName.lastName),
    ),
  };
}

function child(
  familyIndex: number,
  childIndex: number,
  lastName: string,
): DemoChild {
  const gender = alternatingGender(familyIndex + childIndex + 1);
  const age = 5 + ((familyIndex * 2 + childIndex * 3) % 13);

  return {
    legalName: `${moroccanFirstName(gender)} ${lastName}`,
    dateOfBirth: `${2026 - age}-${String(1 + ((familyIndex + childIndex) % 12)).padStart(2, "0")}-${String(1 + ((familyIndex * 3 + childIndex) % 27)).padStart(2, "0")}`,
    gender,
    schoolLevel: SCHOOL_LEVELS[Math.min(3, Math.floor(age / 5))]!,
    clothingSize: pick(CLOTHING_SIZES),
    shoeSize: String(28 + ((familyIndex + childIndex) % 15)),
    notes: "Generated Kafil demo child.",
  };
}

function readCount(
  args: readonly string[],
  longName: string,
  shortName: string,
  fallback: number,
) {
  let raw: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]!;
    if (argument.startsWith(`--${longName}=`)) {
      raw = argument.slice(longName.length + 3);
      break;
    }
    if (argument === `--${longName}` || argument === `-${shortName}`) {
      raw = args[index + 1];
      break;
    }
  }

  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 0 || value > 10_000) {
    throw new Error(
      `--${longName} must be an integer between 0 and 10000.`,
    );
  }
  return value;
}

function validateCounts(counts: DemoSeedCounts) {
  for (const [name, value] of Object.entries(counts)) {
    if (!Number.isSafeInteger(value) || value < 0 || value > 10_000) {
      throw new Error(`${name} must be an integer between 0 and 10000.`);
    }
  }
}

function stableUuid(namespace: number, index: number) {
  const suffix = `${String(namespace).padStart(3, "0")}${String(index + 1).padStart(9, "0")}`;
  return `00000000-0000-4000-8000-${suffix}`;
}

function seedEmail(kind: string, index: number) {
  return `${kind}.${String(index + 1).padStart(3, "0")}@demo.kafil.test`;
}

function seedPhone(group: number, index: number) {
  return `+2126${String(group).padStart(2, "0")}${String(index + 1).padStart(6, "0")}`;
}

function seedCin(prefix: string, index: number) {
  return `${prefix}${String(index + 1).padStart(6, "0")}`;
}

function alternatingGender(index: number): "F" | "M" {
  return index % 2 === 0 ? "F" : "M";
}

type AdultNameGenerator = (gender: "F" | "M") => MoroccanNameParts;

function uniqueAdultNameGenerator(): AdultNameGenerator {
  const usedNames = new Set<string>();

  return (gender) => {
    for (let attempt = 0; attempt < 1_000; attempt += 1) {
      const name = moroccanNameParts(gender);
      if (!usedNames.has(name.fullName)) {
        usedNames.add(name.fullName);
        return name;
      }
    }

    throw new Error("Unable to generate a unique demo account name.");
  };
}

function moroccanAddress() {
  return `${faker.number.int({ min: 1, max: 300 })} ${pick(STREETS)}, ${pick(CITIES)}`;
}

function adultBirthDate(index: number) {
  const year = 1965 + (index % 35);
  const month = String(1 + (index % 12)).padStart(2, "0");
  const day = String(1 + ((index * 3) % 27)).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function pick<T>(values: readonly T[]): T {
  return faker.helpers.arrayElement([...values]);
}
