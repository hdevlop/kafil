export interface QuotaInput {
  ordersUsed?: number | null;
  ordersLimit?: number | null;
  ordersRemaining?: number | null;
  maxPerOrderMinor?: number | null;
}

export function clampNonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

export function resolveOrdersRemaining(input: QuotaInput): number | null {
  if (input.ordersLimit == null) return null;
  if (input.ordersRemaining != null) {
    return clampNonNegative(input.ordersRemaining);
  }
  const used = input.ordersUsed ?? 0;
  return clampNonNegative(input.ordersLimit - used);
}

export function hasAnyQuota(input: QuotaInput): boolean {
  return input.ordersLimit != null || input.maxPerOrderMinor != null;
}

export function isUnlimitedQuota(input: QuotaInput): boolean {
  return input.ordersLimit == null && input.maxPerOrderMinor == null;
}
