import { pool } from "@kafil/server/database";
import { server } from "@kafil/server";
import { NotificationWorker } from "@kafil/server/modules";

const once = process.argv.includes("--once");

await (async () => {
  try {
    await server.init();
    const worker = server.container.get(NotificationWorker);
    if (once) {
      const work = await worker.dispatchOnce();
      console.log(`Notifications dispatch completed (${work} item(s)).`);
    } else {
      await worker.run();
    }
  } catch (error) {
    process.exitCode = 1;
    console.error(
      "Notifications dispatch failed:",
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    if (once) await pool.end().catch(() => undefined);
  }
})();
