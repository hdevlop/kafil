import { rollbackImageBackfill, runImageBackfill } from "../image-backfill";

function value(name: string) {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

try {
  const rollback = value("rollback");
  if (rollback) {
    console.log(JSON.stringify(await rollbackImageBackfill(rollback), null, 2));
  } else {
    const apply = process.argv.includes("--apply");
    const summary = await runImageBackfill({
      apply,
      databaseBackupPath: value("database-backup"),
      manifestDirectory: value("manifest-directory"),
      storageBackupPath: value("storage-backup"),
      storageBasePath: value("storage-path"),
    });
    console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", ...summary }, null, 2));
  }
} finally {
  await poolEnd();
}

async function poolEnd() {
  const { pool } = await import("@kafil/server/database");
  await pool.end();
}
