import { formatDate } from "najm-kit/format";
import type { NChartDatum, NajmFormatContextValue } from "najm-kit";

export function formatChartMonth(month: string, fmt: NajmFormatContextValue) {
  return formatDate(
    new Date(`${month}-01T00:00:00.000Z`),
    { ...fmt.config, timeZone: "UTC" },
    { month: "short" },
  );
}

export function toChartData(
  data: ReadonlyArray<{ month: string } & Record<string, number | string>>,
  valueKeys: readonly string[],
  fmt: NajmFormatContextValue,
): NChartDatum[] {
  return data.map((point) => ({
    id: point.month,
    label: formatChartMonth(point.month, fmt),
    values: Object.fromEntries(valueKeys.map((key) => [key, Number(point[key] ?? 0)])),
  }));
}
