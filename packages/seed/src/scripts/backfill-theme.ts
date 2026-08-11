import { runThemeBackfill } from "@kafil/server/database";

function value(name: string) {
  const prefix = `--${name}=`;
  return process.argv
    .find((argument) => argument.startsWith(prefix))
    ?.slice(prefix.length);
}

/**
 * `bun run theme:backfill` reports what would move; `--apply` moves it.
 *
 * Run the dry form first and read `skipped`. Every reference that does not
 * become a row is listed there — a branding path whose bytes are gone, a
 * design that no longer validates, a preset the package would refuse to apply.
 */
try {
  const apply = process.argv.includes("--apply");
  const summary = await runThemeBackfill({
    apply,
    storageBasePath: value("storage-path"),
  });
  console.log(JSON.stringify(summary, null, 2));
  if (summary.skipped.length > 0) {
    console.warn(
      `\n${summary.skipped.length} reference(s) were not imported. Review them before cutover.`,
    );
  }
} finally {
  const { pool } = await import("@kafil/server/database");
  await pool.end();
}
