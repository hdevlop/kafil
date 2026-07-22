import { randomInt } from "node:crypto";

function passwordNamePart(fullName: string) {
  const surname = fullName.trim().split(/\s+/u).at(-1) ?? "";
  const ascii = surname
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z]/g, "");
  const safe = ascii.length >= 3 ? ascii : "Kafil";
  return `${safe.charAt(0).toUpperCase()}${safe.slice(1).toLowerCase()}`;
}

export function generateFamilyInitialPassword(
  fullName: string,
  dateOfBirth: string,
) {
  const year = dateOfBirth.slice(0, 4);
  return `${passwordNamePart(fullName)}${year}`;
}

/**
 * Produces an initial credential for operator-created sponsors without relying
 * only on public identity data.
 */
export function generateInitialPassword(
  fullName: string,
  dateOfBirth: string,
  suffix = randomInt(1_000, 10_000),
) {
  const year = dateOfBirth.slice(0, 4);
  return `${passwordNamePart(fullName)}${year}!${suffix}`;
}
