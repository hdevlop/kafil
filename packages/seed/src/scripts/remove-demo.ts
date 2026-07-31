import { removeDemoData } from "../remove-demo-data";
import { runSeedCommand } from "../run-seed";
import { readDatabaseConfig } from "../seed-config";

await runSeedCommand("Demo cleanup", async () => {
  readDatabaseConfig();
  const result = await removeDemoData();
  console.log(
    `Removed: ${result.families} families, ${result.sponsors} sponsors, ${result.operators} operators, ${result.deliveries} delivery staff, ${result.contributions} contributions, ${result.orders} orders, ${result.products} products, ${result.categories} categories, ${result.files} files.`,
  );
});
