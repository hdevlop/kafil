import { LandingFooter, LandingHeader } from "@/features/Landing";

export default function LandingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingHeader />
      {children}
      <LandingFooter />
    </div>
  );
}
