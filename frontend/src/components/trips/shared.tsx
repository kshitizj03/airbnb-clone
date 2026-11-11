"use client";

import { isAfter, parseISO, startOfDay } from "date-fns";
import type { ReactNode } from "react";
import { useAuthModal } from "@/components/layout/AuthModal";
import { Button } from "@/components/ui/Button";
import { guestSummary } from "@/lib/search-params";
import type { Booking } from "@/lib/types";

export type TripTab = "upcoming" | "past" | "cancelled";

/** Upcoming = confirmed and check-out after today; past = confirmed and already over; cancelled = cancelled. */
export function tripTab(b: Booking): TripTab {
  if (b.status === "cancelled") return "cancelled";
  return isAfter(parseISO(b.check_out), startOfDay(new Date())) ? "upcoming" : "past";
}

/** The backend refuses to cancel once check-in is today or earlier, so only offer it before then. */
export const canCancel = (b: Booking): boolean => b.status === "confirmed" && isAfter(parseISO(b.check_in), startOfDay(new Date()));

export const tripGuests = (b: Booking): string => guestSummary({ adults: b.adults, children: b.children, infants: b.infants, pets: b.pets });

const BADGE: Record<TripTab, string> = { upcoming: "Confirmed", past: "Completed", cancelled: "Cancelled" };
export function StatusBadge({ trip }: { trip: Booking }) {
  const tab = tripTab(trip);
  const color = tab === "cancelled" ? "bg-arches/10 text-arches" : tab === "upcoming" ? "bg-discount text-spruce-text" : "bg-quaternary text-secondary";
  return <span className={`inline-block rounded-pill px-2.5 py-1 text-label ${color}`}>{BADGE[tab]}</span>;
}

/** Shown instead of trip data when nobody is logged in. */
export function LoginState() {
  const authModal = useAuthModal();
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-24 text-center">
      <h1 className="text-section">Log in to see your trips</h1>
      <p className="text-secondary">Your reservations show up here once you are logged in.</p>
      <Button variant="primary" className="mt-2" onClick={() => authModal.open("Log in to see your trips")}>
        Log in
      </Button>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: ReactNode; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-24 text-center">
      <p className="text-section">Something went wrong</p>
      <p className="text-secondary">{message}</p>
      <Button className="mt-2" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
