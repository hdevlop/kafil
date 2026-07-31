import { server } from "@kafil/server";
import { CatalogService } from "@kafil/server/modules";

import { seedCatalogCategories } from "../category-seed";
import { seedDemoCatalogProducts } from "../demo-catalog";
import { runSeedCommand } from "../run-seed";
import { readSeedVerificationConfig } from "../seed-config";
import { verifyAuthenticationSeed } from "../seed-auth";

await runSeedCommand("Kafil catalog product seed", async () => {
  const config = readSeedVerificationConfig();
  const auth = await verifyAuthenticationSeed(config.adminEmail);
  await server.init();

  const catalog = server.container.get(CatalogService);
  const categoryResult = await seedCatalogCategories(catalog, auth.admin.id);
  console.log(
    `categories: ${categoryResult.inserted} inserted, ${categoryResult.repaired} repaired, ${categoryResult.skipped} skipped.`,
  );

  const productResult = await seedDemoCatalogProducts(catalog, auth.admin.id);
  console.log(
    `products: ${productResult.inserted} inserted, ${productResult.repaired} repaired, ${productResult.retired} retired, ${productResult.skipped} skipped.`,
  );
});
