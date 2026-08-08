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

/**
 * Produces an initial credential for operator-created sponsors and staff
 * without relying only on public identity data.
 *
 * Families do not use this. Their first credential is the guardian CIN, which
 * `najm-auth` hashes as a temporary credential during provisioning and forces
 * them to replace at first login.
 */
export function generateInitialPassword(
  fullName: string,
  dateOfBirth: string,
  suffix = randomInt(1_000, 10_000),
) {
  const year = dateOfBirth.slice(0, 4);
  return `${passwordNamePart(fullName)}${year}!${suffix}`;
}
