// Pure date-range rules for the calendar. Booked ranges are half open: [check_in, check_out),
// so the night of check_in is taken but a guest may still check OUT on a booked range's check_in day.
// Checked by date-range.check.mjs (run: npm run check:dates, needs Node 22.18+).
import { isAfter, isBefore } from "date-fns";

export type DateRange = { from?: Date; to?: Date };
export type BookedRange = [Date, Date];

/** Is the night starting on `day` already taken? */
export const isBookedNight = (day: Date, booked: BookedRange[]): boolean =>
  booked.some(([a, b]) => !isBefore(day, a) && isBefore(day, b));

/** A stay from `from` to `to` is valid when it has at least one night and no booked night inside it. */
export const canSelectRange = (from: Date, to: Date, booked: BookedRange[]): boolean =>
  isAfter(to, from) && !booked.some(([a, b]) => isBefore(a, to) && isBefore(from, b));

/** Is `day` unclickable right now? Depends on whether we are choosing a check-in or a check-out. */
export function isDayDisabled(day: Date, value: DateRange, booked: BookedRange[], minDate: Date): boolean {
  if (isBefore(day, minDate)) return true;
  const choosingCheckout = value.from && !value.to && isAfter(day, value.from);
  return choosingCheckout ? !canSelectRange(value.from!, day, booked) : isBookedNight(day, booked);
}

/** Result of clicking `day`: complete the range, or start a new one. */
export function nextRange(day: Date, value: DateRange, booked: BookedRange[], minDate: Date): DateRange {
  if (isDayDisabled(day, value, booked, minDate)) return value;
  if (value.from && !value.to && isAfter(day, value.from)) return { from: value.from, to: day };
  return { from: day };
}
