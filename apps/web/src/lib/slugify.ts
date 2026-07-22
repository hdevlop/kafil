export function slugify(value: string, options: { upperCase?: boolean } = {}): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);

  const base = options.upperCase ? normalized.toUpperCase() : normalized;
  return base || (options.upperCase
    ? crypto.randomUUID().slice(0, 8).toUpperCase()
    : crypto.randomUUID().slice(0, 8));
}
