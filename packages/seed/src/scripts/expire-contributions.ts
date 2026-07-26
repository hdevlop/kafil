import { server } from "@kafil/server";
import { ContributionService } from "@kafil/server/modules";
import { pool } from "@kafil/server/database";

const BATCH_SIZE = 200;

await (async () => {
  console.log("Starting pending contribution expiry sweep...");
  try {
    await server.init();
    const service = server.container.get(ContributionService);
    let totalExpired = 0;
    let iterations = 0;
    while (iterations < 100) {
      const processed = await service.expireDue(new Date(), BATCH_SIZE);
      totalExpired += processed;
      iterations += 1;
      if (processed === 0) break;
    }
    console.log(
      `Expired ${totalExpired} pending contribution(s) across ${iterations} batch(es).`,
    );
  } catch (error) {
    process.exitCode = 1;
    console.error(
      "Expiry sweep failed:",
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    await pool.end();
  }
})();