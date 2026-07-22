"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getFamilyPasswordRequirement } from "@/services/accessApi";

export function FamilyPasswordRequirementGuard({
  children,
  role,
}: Readonly<{
  children: React.ReactNode;
  role?: string | null;
}>) {
  const router = useRouter();
  const [ready, setReady] = useState(role !== "family");

  useEffect(() => {
    if (role !== "family") return;

    let active = true;
    void getFamilyPasswordRequirement()
      .then(({ mustChangePassword }) => {
        if (!active) return;
        if (mustChangePassword) {
          router.replace("/change-password");
          return;
        }
        setReady(true);
      })
      .catch(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, [role, router]);

  if (!ready) {
    return (
      <main className="grid min-h-screen place-items-center bg-background text-muted-foreground">
        Checking account…
      </main>
    );
  }

  return children;
}
