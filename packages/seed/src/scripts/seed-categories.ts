import { server } from "@kafil/server";
import { CatalogService } from "@kafil/server/modules";

import { seedCatalogCategories } from "../category-seed";
import { runSeedCommand } from "../run-seed";
import { readSeedVerificationConfig } from "../seed-config";
import { verifyAuthenticationSeed } from "../seed-auth";

await runSeedCommand("Kafil catalog category seed", async () => {
  const config = readSeedVerificationConfig();
  const auth = await verifyAuthenticationSeed(config.adminEmail);
  await server.init();

  const result = await seedCatalogCategories(
    server.container.get(CatalogService),
    auth.admin.id,
  );
  console.log(
    `categories: ${result.inserted} inserted, ${result.repaired} repaired, ${result.skipped} skipped.`,
  );
});
