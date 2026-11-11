"use client";

import { useQuery } from "@tanstack/react-query";
import { isSameDay, isAfter, parseISO, startOfDay } from "date-fns";
import Link from "next/link";
import { useState } from "react";
import { ErrorState, tripGuests } from "@/components/trips/shared";
import { Avatar } from "@/components/ui/Avatar";
import { buttonStyles } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { formatDateRange, formatINR } from "@/lib/format";
import type { Booking, HostListingCard } from "@/lib/types";

type View = "today" | "upcoming" | "past" | "cancelled";

const pill = (on: boolean) => `rounded-pill px-4 py-2 text-tab ${on ? "bg-hof text-on-hof" : "border border-deco hover:border-hof"}`;
const selectCls = "rounded-pill border border-deco bg-surface px-3 py-2 text-tab hover:border-hof";

function ReservationCard({ b }: { b: Booking }) {
  const name = b.guest?.name ?? "Guest";
  const guests = tripGuests(b);
  return (
    <li className="flex items-center gap-4 rounded-16 border border-deco p-4">
      <Avatar name={name} src={b.guest?.avatar_url ?? null} size={48} />
      <div className="min-w-0 flex-1">
        <p className="text-card">{name}</p>
        <p className="truncate text-sm text-secondary">{b.listing.title}</p>
        <p className="text-sm text-secondary">
          {formatDateRange(parseISO(b.check_in), parseISO(b.check_out))} · {guests}
        </p>
      </div>
      <p className="shrink-0 text-card">{formatINR(b.total)}</p>
    </li>
  );
}

function useReservations(status: string, listingId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["host", "reservations", status, listingId],
    queryFn: () => api<Booking[]>(`/api/host/reservations?status=${status}${listingId ? `&listing_id=${listingId}` : ""}`),
    enabled,
  });
}

export function TodayPage() {
  const { user } = useAuth();
  const [view, setView] = useState<View>("today");
  const [listingId, setListingId] = useState("");

  const listings = useQuery({ queryKey: ["host", "listings"], queryFn: () => api<HostListingCard[]>("/api/host/listings"), enabled: !!user });

  const upcoming = useReservations("upcoming", listingId, !!user && (view === "today" || view === "upcoming"));
  const past = useReservations("past", listingId, !!user && (view === "today" || view === "past"));
  const cancelled = useReservations("cancelled", listingId, !!user && view === "cancelled");

  const today = startOfDay(new Date());
  // The API's "upcoming" is check-out after today, so a guest leaving today is in "past": Today needs both lists.
  const rows: Record<View, Booking[] | undefined> = {
    today:
      upcoming.data && past.data
        ? [
            ...upcoming.data.filter((b) => !isAfter(parseISO(b.check_in), today)),
            ...past.data.filter((b) => isSameDay(parseISO(b.check_out), today)),
          ]
        : undefined,
    upcoming: upcoming.data?.filter((b) => isAfter(parseISO(b.check_in), today)),
    past: past.data,
    cancelled: cancelled.data,
  };
  const active = { today: [upcoming, past], upcoming: [upcoming], past: [past], cancelled: [cancelled] }[view];
  const failed = active.find((q) => q.isError);
  const items = rows[view];

  if (failed) return <ErrorState message="We could not load your reservations." onRetry={() => failed.refetch()} />;

  const hasListings = (listings.data?.length ?? 0) > 0;
  const emptyTitle = { today: "You don't have any reservations", upcoming: "You don't have any upcoming reservations", past: "No past reservations", cancelled: "No cancelled reservations" }[view];

  return (
    <div className="mx-auto max-w-[900px] px-4 py-8 md:px-12">
      <h1 className="mb-6 text-[28px] leading-8 font-medium">Your reservations</h1>

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Reservation period" className="flex gap-2">
          <button type="button" aria-pressed={view === "today"} className={pill(view === "today")} onClick={() => setView("today")}>
            Today
          </button>
          <button type="button" aria-pressed={view === "upcoming"} className={pill(view === "upcoming")} onClick={() => setView("upcoming")}>
            Upcoming
          </button>
        </div>
        <select
          aria-label="Past or cancelled reservations"
          value={view === "past" || view === "cancelled" ? view : ""}
          onChange={(e) => e.target.value && setView(e.target.value as View)}
          className={selectCls}
        >
          <option value="">Past / Cancelled</option>
          <option value="past">Past</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select aria-label="Listing" value={listingId} onChange={(e) => setListingId(e.target.value)} className={`${selectCls} max-w-full truncate md:ml-auto`}>
          <option value="">All listings</option>
          {listings.data?.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title}
            </option>
          ))}
        </select>
      </div>

      {!items ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-[98px] w-full rounded-16" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-[28px] leading-8 font-medium">{emptyTitle}</p>
          <p className="text-secondary">When a guest books one of your listings, it will show up here.</p>
          {listings.data && !hasListings && (
            <Link href="/become-a-host" className={buttonStyles("dark", "md", "mt-2 !bg-quaternary !text-hof hover:!bg-bebe")}>
              Create a listing
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((b) => (
            <ReservationCard key={b.id} b={b} />
          ))}
        </ul>
      )}
    </div>
  );
}
