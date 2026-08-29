const runLabelPattern = "auth-[a-z0-9]+-[0-9a-f]{8}";
const familyNamePattern = new RegExp(`^Auth Family ${runLabelPattern}$`);
const familyEmailPattern = new RegExp(
  `^${runLabelPattern}-family@c4a-family\\.test$`,
);
const sponsorNamePattern = new RegExp(`^Auth Sponsor ${runLabelPattern}$`);
const sponsorEmailPattern = new RegExp(
  `^${runLabelPattern}-sponsora@c4a-sponsor\\.test$`,
);

function stringField(row: Record<string, unknown>, name: string): string {
  const value = row[name];
  return typeof value === "string" ? value : "";
}

export function isDisposableAuthFamily(row: Record<string, unknown>): boolean {
  return (
    familyNamePattern.test(stringField(row, "name")) &&
    familyEmailPattern.test(stringField(row, "email").toLowerCase())
  );
}

export function isDisposableAuthSponsor(row: Record<string, unknown>): boolean {
  return (
    sponsorNamePattern.test(stringField(row, "name")) &&
    sponsorEmailPattern.test(stringField(row, "email").toLowerCase())
  );
}

export function isDisposableAuthSponsorRecipient(address: string): boolean {
  return sponsorEmailPattern.test(address.toLowerCase());
}
