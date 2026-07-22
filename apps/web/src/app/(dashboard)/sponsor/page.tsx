import { SponsorProfileGate } from "@/features/SponsorProfile";

export const metadata = { title: "Sponsor dashboard" };

export default function SponsorPage() {
  return <SponsorProfileGate />;
}
