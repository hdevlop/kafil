export function responseRows(value: unknown): Array<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || !("data" in value)) return [];
  const data = (value as { data: unknown }).data;
  if (!Array.isArray(data)) return [];
  return data.filter(
    (row): row is Record<string, unknown> => typeof row === "object" && row !== null,
  );
}
