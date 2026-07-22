"use client";

import { CalendarClock, LockKeyhole, ReceiptText, WalletCards } from "lucide-react";
import { NCard, NCardAction, NCardInfo, NCardSection } from "najm-kit";

import { formatKafilDate, formatMad, formatStatusLabel } from "@/lib/format";

import type { FamilyBudgetLedgerEntry } from "../types";

export function FamilyBudgetLedgerCard({
  data,
}: Readonly<{ data: FamilyBudgetLedgerEntry }>) {
  return (
    <NCard
      embedded
      title={formatMad(data.amountMinor)}
      description={formatStatusLabel(data.entryType)}
    >
      <NCardAction>
        <p className="text-sm text-muted-foreground">{formatKafilDate(data.createdAt)}</p>
      </NCardAction>
      <NCardSection>
        <NCardInfo icon={WalletCards} label="Available after" value={formatMad(data.availableAfterMinor)} />
        <NCardInfo icon={LockKeyhole} label="Reserved after" value={formatMad(data.reservedAfterMinor)} />
        <NCardInfo icon={ReceiptText} label="Source" value={formatStatusLabel(data.sourceType)} />
        <NCardInfo icon={CalendarClock} label="Spent after" value={formatMad(data.spentAfterMinor)} />
      </NCardSection>
    </NCard>
  );
}
