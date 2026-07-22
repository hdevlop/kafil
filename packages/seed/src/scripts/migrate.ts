import { migrateDatabase } from "../migrate-database";
import { runSeedCommand } from "../run-seed";
import { readDatabaseConfig } from "../seed-config";

await runSeedCommand("Kafil database migration", async () => {
  readDatabaseConfig();
  await migrateDatabase();
});
