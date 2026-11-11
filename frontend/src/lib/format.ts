import { differenceInCalendarDays, format, isSameMonth, isSameYear } from "date-fns";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** 16380 -> "₹16,380" */
export const formatINR = (n: number): string => inr.format(n);

/** Same month: "10–14 Dec". Otherwise "28 Dec – 2 Jan" (with years if they differ). */
export function formatDateRange(a: Date, b: Date): string {
  if (isSameMonth(a, b) && isSameYear(a, b)) return `${format(a, "d")}–${format(b, "d MMM")}`;
  const fmt = isSameYear(a, b) ? "d MMM" : "d MMM yyyy";
  return `${format(a, fmt)} – ${format(b, fmt)}`;
}

export const nightsBetween = (a: Date, b: Date): number => differenceInCalendarDays(b, a);

/** Search bar text for a (maybe half chosen) range: "10–14 Dec", "10 Dec", or "" when empty. */
export function dateSummary(from?: Date, to?: Date): string {
  if (from && to) return formatDateRange(from, to);
  return from ? format(from, "d MMM") : "";
}
