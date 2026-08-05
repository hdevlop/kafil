import type { NChartDatum } from "najm-kit";

import type { KafilLanguage } from "@/lib/format";

export function formatChartMonth(month: string, language: KafilLanguage) {
  return new Intl.DateTimeFormat(
    language === "ar" ? "ar-MA" : language === "fr" ? "fr-MA" : "en-MA",
    { month: "short", timeZone: "UTC" },
  ).format(new Date(`${month}-01T00:00:00.000Z`));
}

export function toChartData(
  data: ReadonlyArray<{ month: string } & Record<string, number | string>>,
  valueKeys: readonly string[],
  language: KafilLanguage,
): NChartDatum[] {
  return data.map((point) => ({
    id: point.month,
    label: formatChartMonth(point.month, language),
    values: Object.fromEntries(valueKeys.map((key) => [key, Number(point[key] ?? 0)])),
  }));
}
