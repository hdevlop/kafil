import { printVerification, runSeedCommand } from "../run-seed";
import { readSeedVerificationConfig } from "../seed-config";
import { verifyAuthenticationSeed } from "../seed-auth";

await runSeedCommand("Kafil seed verification", async () => {
  const config = readSeedVerificationConfig();
  printVerification(await verifyAuthenticationSeed(config.adminEmail));
});
