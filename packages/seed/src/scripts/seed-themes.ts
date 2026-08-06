import { runSeedCommand } from "../run-seed";
import { seedThemePresets } from "../theme-preset-seed";

await runSeedCommand("Kafil theme preset seed", async () => {
  const presets = await seedThemePresets();
  console.log(
    `Theme presets: ${presets.inserted} inserted, ${presets.updated} refreshed.`,
  );
  for (const name of presets.names) console.log(`  - ${name}`);
});
