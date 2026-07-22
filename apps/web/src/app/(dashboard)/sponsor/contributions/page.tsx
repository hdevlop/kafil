import { SponsorContributionsPage } from "@/features/SponsorWorkspace";
export const metadata = { title: "Contributions" };
export default async function SponsorContributionsRoutePage({ searchParams }: PageProps<"/sponsor/contributions">) { const { assignment } = await searchParams; return <SponsorContributionsPage initialAssignmentId={typeof assignment === "string" ? assignment : ""} />; }
