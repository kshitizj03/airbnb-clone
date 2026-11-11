"use client";

import { useQuery } from "@tanstack/react-query";
import { parseISO } from "date-fns";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { cardTitle } from "@/components/listing/ListingCard";
import { buttonStyles } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { formatDateRange } from "@/lib/format";
import type { Booking } from "@/lib/types";
import { canReview, ErrorState, LoginState, StatusBadge, tripGuests, tripTab, type TripTab } from "./shared";

// Leaflet touches `window`, so the map is only ever loaded in the browser.
const ListingsMap = dynamic(() => import("@/components/map/ListingsMap").then((m) => m.ListingsMap), {
  ssr: false,
  loading: () => <div className="size-full bg-bebe" />,
});

const TABS: { id: TripTab; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "cancelled", label: "Cancelled" },
];
const NO_SAVED = new Set<number>();

export function TripsPage() {
  const { user, isLoading } = useAuth();
  const [tab, setTab] = useState<TripTab>("upcoming");

  const { data, isError, refetch } = useQuery({
    queryKey: ["bookings", "me"],
    queryFn: () => api<Booking[]>("/api/bookings/me"),
    enabled: !!user,
  });

  const shown = useMemo(() => (data ?? []).filter((b) => tripTab(b) === tab), [data, tab]);
  // One pin per listing; its popup links to the trip.
  const pins = useMemo(() => [...new Map(shown.map((b) => [b.listing.id, b.listing])).values()], [shown]);
  const tripFor = (listingId: number) => shown.find((b) => b.listing.id === listingId)?.id;

  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-9 w-40 rounded-8" />
      </div>
    );
  }
  if (!user) return <LoginState />;

  return (
    <div className="mx-auto flex max-w-[1760px] px-6 pb-12 lg:gap-6 lg:px-10">
      <div className="min-w-0 flex-1 pt-8">
        <h1 className="text-[32px] leading-10 font-medium">Trips</h1>

        <div role="tablist" aria-label="Trips" className="mt-6 flex gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-pill border px-4 py-2 text-sm font-medium ${tab === t.id ? "border-hof bg-hof text-white" : "border-deco hover:border-hof"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {isError ? (
            <ErrorState message="We could not load your trips." onRetry={() => refetch()} />
          ) : !data ? (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-36 w-full rounded-20" />
              ))}
            </div>
          ) : shown.length === 0 ? (
            data.length === 0 ? (
              <div className="py-12">
                <h2 className="text-section font-semibold">Map out your next trip</h2>
                <p className="mt-2 max-w-md text-secondary">
                  After you book a trip, experience or service, come back here to see details, explore the map and save places to visit.
                </p>
                <Link href="/" className={buttonStyles("primary", "md", "mt-6")}>
                  Start searching
                </Link>
              </div>
            ) : (
              <p className="py-12 text-secondary">No {tab} trips.</p>
            )
          ) : (
            <ul className="space-y-4">
              {shown.map((b) => (
                <li key={b.id}>
                  <TripCard trip={b} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="sticky top-[97px] hidden h-[calc(100vh-113px)] w-[40%] shrink-0 overflow-hidden rounded-20 border border-bebe lg:mt-8 lg:block">
        <ListingsMap listings={pins} hoveredId={null} savedIds={NO_SAVED} hrefFor={(id) => `/trips/${tripFor(id) ?? ""}`} />
      </div>
    </div>
  );
}

function TripCard({ trip: b }: { trip: Booking }) {
  return (
    <Link href={`/trips/${b.id}`} className="flex gap-4 rounded-20 border border-bebe p-3 hover:shadow-elevation2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={b.listing.photos[0]} alt="" className="size-28 shrink-0 rounded-16 bg-bebe object-cover sm:size-36" />
      <div className="min-w-0 py-1">
        <StatusBadge trip={b} />
        <p className="mt-2 truncate text-section">{b.listing.city}</p>
        <p className="truncate text-secondary">{cardTitle(b.listing)}</p>
        <p className="mt-1">{formatDateRange(parseISO(b.check_in), parseISO(b.check_out))}</p>
        <p className="text-secondary">{tripGuests(b)}</p>
        {canReview(b) && <p className="mt-1 text-sm font-medium underline">Write a review</p>}
      </div>
    </Link>
  );
}
