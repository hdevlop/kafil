import { ContributionsPage } from "@/features/Contributions";

export const metadata = { title: "Contributions" };

export default async function ContributionPage({
  searchParams,
}: PageProps<"/contribution">) {
  const { assignment } = await searchParams;
  return (
    <ContributionsPage
      initialAssignmentId={typeof assignment === "string" ? assignment : ""}
    />
  );
}
