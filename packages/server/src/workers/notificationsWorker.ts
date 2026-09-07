import { pool } from "@kafil/server/database";
import { server } from "@kafil/server";
import { NotificationWorker } from "@kafil/server/modules";

await (async () => {
  console.log("Starting notifications worker...");
  try {
    await server.init();
    const worker = server.container.get(NotificationWorker);
    await worker.run();
  } catch (error) {
    process.exitCode = 1;
    console.error(
      "Notifications worker failed:",
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    await pool.end().catch(() => undefined);
  }
})();
