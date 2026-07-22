import { ContributionsPage } from "@/features/Contributions";

export const metadata = { title: "Contributions" };

export default async function OperatorContributionsPage({
  searchParams,
}: PageProps<"/operator/contributions">) {
  const { family } = await searchParams;
  return (
    <ContributionsPage
      familyProfileId={typeof family === "string" ? family : undefined}
    />
  );
}
