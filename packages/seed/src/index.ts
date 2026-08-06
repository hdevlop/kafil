import { clearSeedData, clearSeedStorage } from "./clear-seed-data";
import { migrateDatabase } from "./migrate-database";
import { printVerification, runSeedCommand } from "./run-seed";
import { readSeedConfig } from "./seed-config";
import { seedAuthentication } from "./seed-auth";
import { seedThemePresets } from "./theme-preset-seed";

await runSeedCommand("Kafil database setup", async () => {
  const config = readSeedConfig();

  console.log("Applying database migrations...");
  await migrateDatabase();
  console.log("Database migrations applied.");

  console.log("Clearing existing application data...");
  await clearSeedData(config.adminEmail);
  await clearSeedStorage();
  console.log("Existing application data cleared.");

  console.log("Seeding admin, roles, and permissions...");
  const {
    adminEmailChanged,
    adminPasswordChanged,
    result,
    verification,
  } = await seedAuthentication(config.adminEmail, config.adminPassword);
  console.log(
    `Auth seed result: ${result.inserted} inserted, ${result.skipped} skipped, ${result.failed} failed.`,
  );
  console.log(
    adminEmailChanged || adminPasswordChanged
      ? "Admin credentials synchronized; existing sessions were revoked when credentials changed."
      : "Admin email and password already match.",
  );
  printVerification(verification);

  console.log("Seeding built-in theme presets...");
  const presets = await seedThemePresets();
  console.log(
    `Theme presets: ${presets.inserted} inserted, ${presets.updated} refreshed (${presets.names.join(", ")}).`,
  );
});
