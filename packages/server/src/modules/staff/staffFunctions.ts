export const STAFF_FUNCTION_KEYS = [
  "operator",
  "delivery",
] as const;

export type StaffFunctionKey = (typeof STAFF_FUNCTION_KEYS)[number];

export function isStaffFunctionKey(value: string): value is StaffFunctionKey {
  return (STAFF_FUNCTION_KEYS as readonly string[]).includes(value);
}