const compatibleStatuses: Readonly<Record<string, readonly string[]>> = {
  approved: [
    "approved",
    "purchased",
    "out_for_delivery",
    "delivered",
    "cancelled",
  ],
  cancelled: ["cancelled"],
  delivered: ["delivered"],
  out_for_delivery: ["out_for_delivery", "delivered", "cancelled"],
  pending: [
    "pending",
    "approved",
    "purchased",
    "out_for_delivery",
    "delivered",
    "rejected",
    "cancelled",
  ],
  purchased: ["purchased", "out_for_delivery", "delivered", "cancelled"],
  rejected: ["rejected"],
};

export function isDemoOrderStatusCompatible(
  actual: string,
  expected: string,
) {
  return compatibleStatuses[expected]?.includes(actual) ?? false;
}
