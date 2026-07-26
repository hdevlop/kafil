import { runMigrations } from "./migrationRunner";

try {
  await runMigrations();
} catch (error) {
  console.error(
    error instanceof Error ? `[migration] ${error.message}` : error,
  );
  process.exitCode = 1;
}
