import { db } from "@kafil/server/database";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { resolve } from "node:path";

export const MIGRATIONS_FOLDER = resolve(
  import.meta.dir,
  "../../server/migrations",
);

export async function migrateDatabase() {
  await migrate(db, {
    migrationsFolder: MIGRATIONS_FOLDER,
  });
}
