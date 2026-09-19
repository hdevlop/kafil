/**
 * Najm's `authSeed()` derives role and permission keys from the domain name with
 * this exact normalization. Diverge and a Kafil-created role and a Najm-seeded
 * role become two rows with the same name. Keep one copy.
 */
export function stableSeedId(prefix: string, value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);

  return `${prefix}_${normalized || "item"}`;
}
