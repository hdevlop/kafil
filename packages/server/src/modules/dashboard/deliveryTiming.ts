export interface CasablancaClock {
  date: string;
  minute: number;
}

export function casablancaClock(now: Date): CasablancaClock {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: "Africa/Casablanca",
    year: "numeric",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    minute: Number(value("hour")) * 60 + Number(value("minute")),
  };
}

export function isDeliveryDelayed(
  delivery: {
    attemptStatus: string;
    selectedDate: string;
    windowEndMinute: number | null;
  },
  clock: CasablancaClock,
): boolean {
  if (["delivered", "failed", "cancelled"].includes(delivery.attemptStatus)) {
    return false;
  }
  if (delivery.selectedDate < clock.date) return true;
  return delivery.selectedDate === clock.date &&
    delivery.windowEndMinute != null &&
    delivery.windowEndMinute < clock.minute;
}
