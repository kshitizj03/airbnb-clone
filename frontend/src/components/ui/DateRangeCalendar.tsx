"use client";

import { format, startOfDay } from "date-fns";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { isBookedNight, isDayDisabled, nextRange, type BookedRange, type DateRange } from "@/lib/date-range";

interface DateRangeCalendarProps {
  value: DateRange;
  onChange: (value: DateRange) => void;
  months?: 1 | 2;
  /** Booked stays as [check_in, check_out): the nights inside are taken. */
  disabledRanges?: BookedRange[];
  minDate?: Date;
}

/** react-day-picker for the grid; which days are clickable and what a click means is in lib/date-range.ts. */
export function DateRangeCalendar({ value, onChange, months = 2, disabledRanges = [], minDate }: DateRangeCalendarProps) {
  const min = startOfDay(minDate ?? new Date());

  return (
    <DayPicker
      className="airbnb-cal"
      mode="range"
      selected={{ from: value.from, to: value.to }}
      numberOfMonths={months}
      navLayout="around"
      startMonth={min}
      defaultMonth={value.from ?? min}
      disabled={(day) => isDayDisabled(startOfDay(day), value, disabledRanges, min)}
      modifiers={{ booked: (day) => isBookedNight(startOfDay(day), disabledRanges) }}
      modifiersClassNames={{ booked: "cal-booked" }}
      // We own the click logic (check-in, then check-out), so the built-in range handler is bypassed.
      onDayClick={(day) => onChange(nextRange(startOfDay(day), value, disabledRanges, min))}
      formatters={{ formatWeekdayName: (d) => format(d, "EEEEE") }}
    />
  );
}
