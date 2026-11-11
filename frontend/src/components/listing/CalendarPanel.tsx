"use client";

import { format } from "date-fns";
import { DateRangeCalendar } from "@/components/ui/DateRangeCalendar";
import { nightsBetween } from "@/lib/format";
import type { BookedRange, DateRange } from "@/lib/date-range";

interface Props {
  range: DateRange;
  booked: BookedRange[];
  months: 1 | 2;
  city?: string; // "4 nights in Goa" in the page section, "4 nights" in the booking popover
  onChange: (r: DateRange) => void;
  onClose?: () => void;
}

/** Heading + calendar + "Clear dates", used inline on the page, in the booking card popover and in the mobile sheet. */
export function CalendarPanel({ range, booked, months, city, onChange, onClose }: Props) {
  const { from, to } = range;
  const nights = from && to ? nightsBetween(from, to) : 0;
  const title = nights
    ? `${nights} night${nights === 1 ? "" : "s"}${city ? ` in ${city}` : ""}`
    : from
      ? "Select check-out date"
      : "Select check-in date";
  const fmt = (d: Date) => format(d, "d MMM yyyy");

  return (
    <div>
      <h3 className="text-section">{title}</h3>
      <p className="mt-1 text-sm text-secondary">{from && to ? `${fmt(from)} - ${fmt(to)}` : "Add your travel dates for exact pricing"}</p>
      <div className="mt-4 flex justify-center overflow-x-auto">
        <DateRangeCalendar value={range} onChange={onChange} months={months} disabledRanges={booked} />
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          disabled={!from}
          onClick={() => onChange({})}
          className="rounded-8 px-3 py-2 text-sm font-medium underline hover:bg-faint disabled:text-disabled disabled:no-underline disabled:hover:bg-transparent"
        >
          Clear dates
        </button>
        {onClose && (
          <button type="button" onClick={onClose} className="rounded-8 bg-hof px-4 py-2 text-sm font-medium text-white hover:bg-black">
            Close
          </button>
        )}
      </div>
    </div>
  );
}
