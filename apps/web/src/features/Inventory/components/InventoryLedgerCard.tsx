"use client";

import { Boxes, CalendarClock, LockKeyhole, ReceiptText } from "lucide-react";
import { NCard, NCardAction, NCardInfo, NCardSection } from "najm-kit";

import {
  formatKafilDate,
  formatKafilNumber,
  formatStatusLabel,
} from "@/lib/format";

import type { InventoryLedgerEntry } from "../types";

export function InventoryLedgerCard({
  data,
}: Readonly<{ data: InventoryLedgerEntry }>) {
  return (
    <NCard
      embedded
      title={formatKafilNumber(data.quantity)}
      description={formatStatusLabel(data.entryType)}
    >
      <NCardAction>
        <p className="text-sm text-muted-foreground">
          {formatKafilDate(data.createdAt)}
        </p>
      </NCardAction>
      <NCardSection>
        <NCardInfo
          icon={Boxes}
          label="On hand after"
          value={formatKafilNumber(data.onHandAfter)}
        />
        <NCardInfo
          icon={LockKeyhole}
          label="Reserved after"
          value={formatKafilNumber(data.reservedAfter)}
        />
        <NCardInfo
          icon={ReceiptText}
          label="Reason"
          value={data.reason || "No reason recorded"}
        />
        <NCardInfo
          icon={CalendarClock}
          label="Source"
          value={formatStatusLabel(data.sourceType)}
        />
      </NCardSection>
    </NCard>
  );
}
