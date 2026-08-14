import { createHash } from "node:crypto";

/**
 * Connected four-account acceptance fixtures.
 *
 * This file may contain only public aliases, deterministic demo IDs,
 * expected statuses, and integer-minor-unit helpers. It must not contain
 * a password, OTP, cookie, reset token, mailbox message, real email
 * address, real phone number, guardian CIN, database URL, or API
 * credential. All run-bound values are produced at runtime by the runner
 * and forwarded to Playwright through environment variables that are
 * stripped when the process exits.
 */

export type RunRoleAlias =
  | "bootstrapAdmin"
  | "family"
  | "sponsorA"
  | "sponsorB";

export const RUN_ROLE_ALIASES = [
  "bootstrapAdmin",
  "family",
  "sponsorA",
  "sponsorB",
] as const satisfies readonly RunRoleAlias[];

export const CONTEXT_ALIAS_TO_INDEX: Record<RunRoleAlias, number> = {
  bootstrapAdmin: 0,
  family: 1,
  sponsorA: 2,
  sponsorB: 3,
};

export interface RunFixture {
  maskedLabel: string;
  adminEmailDomain: string;
  familyEmailDomain: string;
  sponsorEmailDomain: string;
  /** Family funding target in integer minor units (MAD). */
  fundingTargetMinor: number;
  /** Sponsor A's portion of the target in integer minor units (MAD). */
  sponsorATargetMinor: number;
  /** Sponsor B's remainder of the target in integer minor units (MAD). */
  sponsorBTargetMinor: number;
  /** Total amount Sponsor A will submit through lifecycle work units in integer minor units. */
  sponsorAAdditionalMinor: number;
  /** Order 1 reserved total in integer minor units (MAD). */
  order1ReservedMinor: number;
  /** Order 1 cancelled and released. */
  order1TotalMinor: number;
  /** Order 2 rejected after submission. */
  order2ReservedMinor: number;
  /** Order 3 purchased with a different actual total. */
  order3EstimatedMinor: number;
  order3ActualMinor: number;
  /** Locale used by every context for stable selectors. */
  locale: "en";
}

export const CONNECTED_RUN_FIXTURE: RunFixture = {
  maskedLabel: "c4a-20260811",
  adminEmailDomain: "c4a-admin.test",
  familyEmailDomain: "c4a-family.test",
  sponsorEmailDomain: "c4a-sponsor.test",
  // The funding target and splits are chosen so that the integer-only
  // arithmetic never needs floating-point money. The split covers
  // Sponsor A's first contribution + Sponsor B's first contribution
  // landing exactly on the target without remainder.
  fundingTargetMinor: 200_000,
  sponsorATargetMinor: 120_000,
  sponsorBTargetMinor: 80_000,
  sponsorAAdditionalMinor: 30_000,
  order1ReservedMinor: 24_500,
  order1TotalMinor: 24_500,
  order2ReservedMinor: 18_400,
  order3EstimatedMinor: 32_900,
  order3ActualMinor: 31_400,
  locale: "en",
};

/**
 * Sum two positive integer minor-unit amounts with a checked overflow
 * guard. The connected journey never relies on floating-point money.
 */
export function addMinor(...amounts: number[]): number {
  let sum = 0;
  for (const amount of amounts) {
    if (!Number.isInteger(amount) || amount < 0) {
      throw new Error(`addMinor requires non-negative integers, got ${amount}`);
    }
    sum = sum + amount;
  }
  return sum;
}

/**
 * Multiply a positive integer minor-unit amount by a non-negative integer
 * factor without ever producing fractional money.
 */
export function scaleMinor(amount: number, factor: number): number {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error(`scaleMinor requires a non-negative integer base, got ${amount}`);
  }
  if (!Number.isInteger(factor) || factor < 0) {
    throw new Error(`scaleMinor requires a non-negative integer factor, got ${factor}`);
  }
  return amount * factor;
}

/**
 * Format integer minor units for Kafil's MAD amount inputs. The field already
 * supplies the currency label, so the returned value contains only the
 * quotient and two-digit remainder.
 */
export function formatMadFromMinor(amount: number): string {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error(`formatMadFromMinor requires non-negative integer minor units, got ${amount}`);
  }
  const quotient = Math.floor(amount / 100);
  const remainder = amount % 100;
  return `${quotient}.${remainder.toString().padStart(2, "0")}`;
}

/**
 * Build a deterministic, non-real `.test` email for one run + one role.
 * The recipient domain is local-only and never forwards mail.
 */
export function buildRunEmail(label: string, alias: RunRoleAlias): string {
  const sanitized = label.replace(/[^a-z0-9-]/gi, "").toLowerCase();
  const domains: Record<RunRoleAlias, string> = {
    bootstrapAdmin: CONNECTED_RUN_FIXTURE.adminEmailDomain,
    family: CONNECTED_RUN_FIXTURE.familyEmailDomain,
    sponsorA: CONNECTED_RUN_FIXTURE.sponsorEmailDomain,
    sponsorB: CONNECTED_RUN_FIXTURE.sponsorEmailDomain,
  };
  return `${sanitized}-${alias.toLowerCase()}@${domains[alias]}`;
}

/**
 * Build a deterministic, non-real `.test` phone for one run + one role.
 * The phone never dials anywhere; it only normalises through the server.
 */
export function buildRunPhone(label: string, alias: Exclude<RunRoleAlias, "bootstrapAdmin">): string {
  const sanitized = label.replace(/[^a-z0-9-]/gi, "").toLowerCase();
  // Use the full eight-digit subscriber namespace. The previous four-digit
  // suffix offered only 9,000 values, so retained remote demo identities could
  // collide even when every run label was fresh.
  const digest = createHash("sha256")
    .update(`${sanitized}:${alias}`)
    .digest();
  const subscriber = (digest.readUInt32BE(0) % 100_000_000)
    .toString()
    .padStart(8, "0");
  return `+2126${subscriber}`;
}

function hashLabel(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return hash;
}

/**
 * Build a deterministic, non-real CIN (8 chars: 2 letters + 6 digits)
 * that still satisfies the Moroccan `^[a-z]{1,3}\d{5,17}$` regex used
 * by the family provisioning pipeline. Real CINs are forbidden in this
 * fixture file; the prefix `ZZ` and a numeric suffix keep the value
 * stable per run without colliding with seeded demo data.
 */
export function buildRunCin(label: string, alias: RunRoleAlias): string {
  const sanitized = label.replace(/[^a-z0-9-]/gi, "").toLowerCase();
  const numeric = (Math.abs(hashLabel(sanitized + alias)) % 9_000_000)
    .toString()
    .padStart(7, "0");
  return `ZZ${numeric}`;
}

export const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  phone: { width: 390, height: 844 },
  phoneRtl: { width: 390, height: 844 },
} as const;

export type ViewportKey = keyof typeof VIEWPORTS;
