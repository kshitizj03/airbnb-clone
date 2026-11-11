"use client";

import { format, parseISO } from "date-fns";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DateRange } from "@/lib/date-range";
import { searchHref, type Guests } from "@/lib/search-params";
import { useCurrentSearch } from "./useCurrentSearch";

/** The search being edited in the bar (or mobile sheet). Starts from the URL; nothing is committed until search(). */
export function useSearchDraft(onSearched?: () => void) {
  const router = useRouter();
  const current = useCurrentSearch();
  const [location, setLocation] = useState(current.location ?? "");
  const [dates, setDates] = useState<DateRange>({
    from: current.checkIn ? parseISO(current.checkIn) : undefined,
    to: current.checkOut ? parseISO(current.checkOut) : undefined,
  });
  const [guests, setGuests] = useState<Guests>({
    adults: current.adults,
    children: current.children,
    infants: current.infants,
    pets: current.pets,
  });

  function search() {
    const complete = dates.from && dates.to;
    // Keep any filters already in the URL, drop the page number.
    router.push(
      searchHref({
        ...current,
        ...guests,
        location: location.trim() || undefined,
        checkIn: complete ? format(dates.from!, "yyyy-MM-dd") : undefined,
        checkOut: complete ? format(dates.to!, "yyyy-MM-dd") : undefined,
        page: undefined,
      }),
    );
    onSearched?.();
  }

  function clearAll() {
    setLocation("");
    setDates({});
    setGuests({ adults: 0, children: 0, infants: 0, pets: 0 });
  }

  return { location, setLocation, dates, setDates, guests, setGuests, search, clearAll };
}
