export const dashboardKeys = {
  all: ["dashboard"] as const,
  admin: ["dashboard", "operator"] as const,
  family: ["dashboard", "family"] as const,
  delivery: (date: string) => ["dashboard", "delivery", date] as const,
  deliveryContext: ["dashboard", "delivery", "context"] as const,
};
