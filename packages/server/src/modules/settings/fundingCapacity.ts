export type FundingCapacityStatus = "open" | "reserved" | "funded";

export interface CapacityInput {
  targetMinor: number;
  fundedMinor: number;
  pendingMinor: number;
}

export interface CapacityBreakdown {
  status: FundingCapacityStatus;
  targetMinor: number;
  fundedMinor: number;
  pendingMinor: number;
  remainingMinor: number;
  availableToContributeMinor: number;
}

export const MAX_MINOR_UNITS = Number.MAX_SAFE_INTEGER;

export function calculateCapacity(input: CapacityInput): CapacityBreakdown {
  const targetMinor = safeInteger(input.targetMinor);
  const fundedMinor = safeNonNegative(input.fundedMinor);
  const pendingMinor = safeNonNegative(input.pendingMinor);

  const remainingMinor = Math.max(0, targetMinor - fundedMinor);
  const availableToContributeMinor = Math.max(
    0,
    targetMinor - fundedMinor - pendingMinor,
  );

  let status: FundingCapacityStatus;
  if (fundedMinor >= targetMinor && targetMinor > 0) {
    status = "funded";
  } else if (availableToContributeMinor === 0) {
    status = "reserved";
  } else {
    status = "open";
  }

  return {
    status,
    targetMinor,
    fundedMinor,
    pendingMinor,
    remainingMinor,
    availableToContributeMinor,
  };
}

export function pickEarlierExpiry(
  current: Date | null | undefined,
  candidate: Date | null | undefined,
): Date | null {
  if (!current) return candidate ?? null;
  if (!candidate) return current;
  return candidate.getTime() < current.getTime() ? candidate : current;
}

function safeInteger(value: number) {
  if (!Number.isSafeInteger(value)) {
    throw new Error("targetMinor must be a safe integer");
  }
  return value;
}

function safeNonNegative(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("Amounts must be non-negative safe integers");
  }
  return Math.min(value, MAX_MINOR_UNITS);
}