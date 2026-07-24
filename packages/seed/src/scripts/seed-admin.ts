import { printVerification, runSeedCommand } from "../run-seed";
import { readSeedConfig } from "../seed-config";
import { seedAuthentication } from "../seed-auth";

await runSeedCommand("Kafil admin and role seed", async () => {
  const config = readSeedConfig();
  const {
    adminEmailChanged,
    adminPasswordChanged,
    result,
    verification,
  } = await seedAuthentication(config.adminEmail, config.adminPassword);

  console.log(
    `Auth seed result: ${result.inserted} inserted, ${result.skipped} skipped, ${result.failed} failed.`,
  );
  printAdminCredentialChanges(adminEmailChanged, adminPasswordChanged);
  if (
    process.env.KAFIL_ADMIN_INTERACTIVE === "1" &&
    (adminEmailChanged || adminPasswordChanged)
  ) {
    console.log(
      "Database credentials updated. Update your protected environment secret source before running a future non-interactive admin seed.",
    );
  }
  printVerification(verification);
});

function printAdminCredentialChanges(
  adminEmailChanged: boolean,
  adminPasswordChanged: boolean,
) {
  if (adminEmailChanged && adminPasswordChanged) {
    console.log(
      "Admin email and password updated; existing sessions were revoked.",
    );
  } else if (adminEmailChanged) {
    console.log("Admin email updated; existing sessions were revoked.");
  } else if (adminPasswordChanged) {
    console.log("Admin password updated; existing sessions were revoked.");
  } else {
    console.log("Admin email and password already match.");
  }
}
