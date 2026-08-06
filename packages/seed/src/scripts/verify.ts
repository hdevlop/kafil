import { printVerification, runSeedCommand } from "../run-seed";
import { readSeedVerificationConfig } from "../seed-config";
import { verifyAuthenticationSeed } from "../seed-auth";
import { verifyThemePresets } from "../theme-preset-seed";

await runSeedCommand("Kafil seed verification", async () => {
  const config = readSeedVerificationConfig();
  printVerification(await verifyAuthenticationSeed(config.adminEmail));

  const presets = await verifyThemePresets();
  console.log(
    `Theme presets: ${presets.total} total, ${presets.builtIn} built-in.`,
  );
  if (presets.missing.length > 0) {
    throw new Error(
      `Missing built-in theme presets: ${presets.missing.join(", ")}`,
    );
  }
});
