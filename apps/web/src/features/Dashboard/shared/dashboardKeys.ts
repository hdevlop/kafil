export const dashboardKeys = {
  all: ["dashboard"] as const,
  admin: ["dashboard", "operator"] as const,
  family: ["dashboard", "family"] as const,
  delivery: (date: string) => ["dashboard", "delivery", date] as const,
  deliveryFamilies: ["dashboard", "delivery", "families"] as const,
};
