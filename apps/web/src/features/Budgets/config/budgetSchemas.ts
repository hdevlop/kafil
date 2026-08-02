const madAmountPattern = /^-?\d+(?:[.,]\d{1,2})?$/;
const maximumMinorUnits = BigInt(Number.MAX_SAFE_INTEGER);

export function parseMadAmount(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!madAmountPattern.test(normalized)) return null;

  const negative = normalized.startsWith("-");
  const [whole, fraction = ""] = normalized.replace("-", "").split(".");
  const minor = BigInt(`${whole}${fraction.padEnd(2, "0")}`);

  if (minor > maximumMinorUnits) return null;

  return Number(negative ? -minor : minor);
}

export function minorUnitsToMadInput(minorUnits: number) {
  return (minorUnits / 100).toFixed(2);
}
