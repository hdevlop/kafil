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
  guardianCin: string,
) {
  return normalizeFamilyCinCredential(guardianCin);
}

const FAMILY_CIN_CREDENTIAL_PATTERN = /^[a-z]{1,3}\d{5,17}$/i;

export function isFamilyCinCredential(value: string) {
  const trimmed = value.trim();
  return (
    trimmed.length >= 8 &&
    trimmed.length <= 20 &&
    FAMILY_CIN_CREDENTIAL_PATTERN.test(trimmed)
  );
}

export function normalizeFamilyCinCredential(value: string) {
  return isFamilyCinCredential(value) ? value.trim().toLowerCase() : value;
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
