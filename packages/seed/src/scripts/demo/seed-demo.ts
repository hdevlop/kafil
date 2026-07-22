import { server } from "@kafil/server";
import {
  ContributionService,
  FamilyService,
  OperatorService,
  SponsorService,
  SupportAssignmentService,
} from "@kafil/server/modules";

import { prepareDemoProfileImages } from "../../demo-images";
import { seedDemoData } from "../../demo-seed";
import { runSeedCommand } from "../../run-seed";
import { readSeedVerificationConfig } from "../../seed-config";
import { verifyAuthenticationSeed } from "../../seed-auth";
import { generateDemoSeedData, readDemoSeedCounts } from "./generator";

await runSeedCommand("Kafil demo data seed", async () => {
  const config = readSeedVerificationConfig();
  const auth = await verifyAuthenticationSeed(config.adminEmail);
  const counts = readDemoSeedCounts();
  const generatedData = generateDemoSeedData(counts);
  const { data, summary: imageSummary } = await prepareDemoProfileImages(
    generatedData,
  );

  console.log(
    `Preparing ${counts.families} families, ${counts.sponsors} sponsors, ${counts.operators} operators, and ${counts.contributions} contributions...`,
  );
  console.log(
    `Profile images: ${imageSummary.families.assigned} families from ${imageSummary.families.available} files; ${imageSummary.sponsors.assigned} sponsors from ${imageSummary.sponsors.available} files.`,
  );

  await server.init();
  const summary = await seedDemoData(data, auth.admin.id, {
    assignments: server.container.get(SupportAssignmentService),
    contributions: server.container.get(ContributionService),
    families: server.container.get(FamilyService),
    operators: server.container.get(OperatorService),
    sponsors: server.container.get(SponsorService),
  });
  const childCount = data.families.reduce(
    (total, family) => total + family.initialChildren.length,
    0,
  );
  const contributionStates = data.contributions.reduce(
    (totals, contribution) => {
      totals[contribution.expectedStatus] += 1;
      return totals;
    },
    { pending: 0, rejected: 0, validated: 0 },
  );

  for (const [label, result] of Object.entries(summary)) {
    console.log(
      `${label}: ${result.inserted} inserted, ${result.repaired} repaired, ${result.skipped} skipped.`,
    );
  }
  console.log(`children: ${childCount} verified across demo families.`);
  console.log(
    `contribution states: ${contributionStates.validated} validated, ${contributionStates.pending} pending, ${contributionStates.rejected} rejected.`,
  );
});
