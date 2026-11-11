"use client";

import { DateRangeCalendar } from "@/components/ui/DateRangeCalendar";
import type { DateRange } from "@/lib/date-range";

interface WhenPanelProps {
  value: DateRange;
  onChange: (value: DateRange) => void;
  months?: 1 | 2;
}

export function WhenPanel({ value, onChange, months = 2 }: WhenPanelProps) {
  return (
    <div className="flex flex-col items-center">
      {/* Dates | Flexible toggle (desktop only). ponytail: Flexible is not built, so it is disabled. */}
      {months === 2 && (
        <div className="mb-4 flex rounded-pill bg-quaternary p-1 text-tab">
          <span className="rounded-pill bg-raised px-4 py-2 shadow-elevation1">Dates</span>
          <button type="button" disabled title="Coming soon" className="rounded-pill px-4 py-2 text-secondary">
            Flexible
          </button>
        </div>
      )}
      <DateRangeCalendar value={value} onChange={onChange} months={months} />
    </div>
  );
}
