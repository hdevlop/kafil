"use client";

import { AtSign, FileKey2, MapPin, Phone, UserRound } from "lucide-react";
import { NCard } from "najm-kit";

import { getSponsorAvatarImage } from "@/lib/personImages";
import { ManagedAvatar } from "@/shared/ManagedAvatar";

export interface SponsorInfoViewModel {
  name: string;
  email: string;
  image: string | null;
  status: string;
  phone: string | null;
  cin: string | null;
  gender: "F" | "M" | null;
  address: string | null;
  dateOfBirth: string | null;
  notes: string | null;
  createdAt: string;
}

export function SponsorInformationCard({
  sponsor,
  t,
}: Readonly<{
  sponsor: SponsorInfoViewModel;
  t: (key: string) => string;
}>) {
  const details = [
    { icon: UserRound, value: sponsor.name },
    { icon: AtSign, value: sponsor.email },
    { icon: Phone, value: sponsor.phone || t("operator.sponsors.notProvided") },
    { icon: MapPin, value: sponsor.address || t("operator.sponsors.notProvided") },
    {
      icon: UserRound,
      value: sponsor.gender === "F" ? t("operator.sponsors.female") : sponsor.gender === "M" ? t("operator.sponsors.male") : t("operator.sponsors.notProvided"),
    },
    { icon: FileKey2, value: sponsor.cin || t("operator.sponsors.notProvided") },
  ];

  return (
    <NCard title={t("operator.sponsors.information")}>
      <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
        <div className="self-start">
          <ManagedAvatar
            src={getSponsorAvatarImage(sponsor.image, sponsor.gender)}
            size="xl"
            classNames={{ avatar: "bg-muted" }}
          />
        </div>

        <div className="grid content-start gap-x-8 gap-y-3.5 sm:grid-cols-2">
          {details.map(({ icon: Icon, value }) => (
            <div key={value} className="flex min-w-0 items-center gap-2">
              <Icon aria-hidden="true" className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <dd className="min-w-0 break-words text-sm font-medium text-foreground">{value}</dd>
            </div>
          ))}
        </div>
      </div>
    </NCard>
  );
}
