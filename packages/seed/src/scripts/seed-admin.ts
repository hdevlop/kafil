import { printVerification, runSeedCommand } from "../run-seed";
import { readSeedConfig } from "../seed-config";
import { seedAuthentication } from "../seed-auth";

await runSeedCommand("Kafil admin and role seed", async () => {
  const config = readSeedConfig();
  const { adminPasswordChanged, result, verification } = await seedAuthentication(
    config.adminEmail,
    config.adminPassword,
  );

  console.log(
    `Auth seed result: ${result.inserted} inserted, ${result.skipped} skipped, ${result.failed} failed.`,
  );
  console.log(
    adminPasswordChanged
      ? "Admin password synchronized from KAFIL_ADMIN_PASSWORD; existing sessions were revoked."
      : "Admin password already matches KAFIL_ADMIN_PASSWORD.",
  );
  printVerification(verification);
});
