import { server } from "@kafil/server";
import {
  CatalogService,
  ContributionService,
  FamilyService,
  OrderEvidenceService,
  OrderService,
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
    `Family households: ${imageSummary.family.assigned} assigned / ${imageSummary.family.records} records / ${imageSummary.family.files} files`,
  );
  console.log(
    `Sponsors: F ${imageSummary.sponsor.F.assigned} assigned / ${imageSummary.sponsor.F.records} records / ${imageSummary.sponsor.F.files} files; M ${imageSummary.sponsor.M.assigned} / ${imageSummary.sponsor.M.records} / ${imageSummary.sponsor.M.files}`,
  );
  console.log(
    `Children: F ${imageSummary.child.F.assigned} assigned / ${imageSummary.child.F.records} records / ${imageSummary.child.F.files} files; M ${imageSummary.child.M.assigned} / ${imageSummary.child.M.records} / ${imageSummary.child.M.files}`,
  );

  await server.init();
  const summary = await seedDemoData(data, auth.admin.id, {
    assignments: server.container.get(SupportAssignmentService),
    catalog: server.container.get(CatalogService),
    contributions: server.container.get(ContributionService),
    evidence: server.container.get(OrderEvidenceService),
    families: server.container.get(FamilyService),
    operators: server.container.get(OperatorService),
    orders: server.container.get(OrderService),
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
    { expired: 0, pending: 0, rejected: 0, validated: 0 },
  );

  for (const [label, result] of Object.entries(summary)) {
    console.log(
      `${label}: ${result.inserted} inserted, ${result.repaired} repaired, ${result.skipped} skipped.`,
    );
  }
  console.log(`children: ${childCount} verified across demo families.`);
  console.log(
    `contribution states: ${contributionStates.validated} validated, ${contributionStates.pending} live pending, ${contributionStates.expired} expired, ${contributionStates.rejected} rejected.`,
  );
});
