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

/** 2100 -> "₹2.1K", 950 -> "₹950", 110000 -> "₹110K" */
export function shortPrice(n: number): string {
  if (n < 1000) return `₹${n}`;
  return `₹${parseFloat((n / 1000).toFixed(1))}K`;
}
