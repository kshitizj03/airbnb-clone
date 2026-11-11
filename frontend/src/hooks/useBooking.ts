"use client";

import { useQuery } from "@tanstack/react-query";
import { parseISO } from "date-fns";
import { useRouter } from "next/navigation";
import { useAuthModal } from "@/components/layout/AuthModal";
import { api, ApiError } from "@/lib/api";
import type { ListingDetail, PriceQuote } from "@/lib/types";
import { useAuth } from "./useAuth";
import { useRoomParams } from "./useRoomParams";

/** Dates and guests from the URL, the backend's price quote for them, and the Reserve action. Shared by the card, the mobile bar and the sticky nav. */
export function useBooking(listing: ListingDetail) {
  const r = useRoomParams();
  const router = useRouter();
  const { user } = useAuth();
  const authModal = useAuthModal();

  const range = { from: r.checkIn ? parseISO(r.checkIn) : undefined, to: r.checkOut ? parseISO(r.checkOut) : undefined };
  const hasDates = !!(r.checkIn && r.checkOut);

  // Same query string for the quote and for the checkout link.
  const q = new URLSearchParams();
  if (r.checkIn && r.checkOut) {
    q.set("check_in", r.checkIn);
    q.set("check_out", r.checkOut);
  }
  q.set("adults", String(r.guests.adults));
  for (const k of ["children", "infants", "pets"] as const) if (r.guests[k]) q.set(k, String(r.guests[k]));
  const qs = q.toString();

  const { data: quote, error, isPending } = useQuery({
    queryKey: ["quote", listing.id, qs],
    queryFn: () => api<PriceQuote>(`/api/listings/${listing.id}/quote?${qs}`),
    enabled: hasDates,
    retry: false,
  });
  const errorMessage = !error ? null : error instanceof ApiError ? error.message : "Could not load the price. Please try again.";

  function reserve() {
    if (!user) return authModal.open("Log in to reserve this place");
    router.push(`/book/stays/${listing.id}?${qs}`);
  }

  return {
    ...r,
    range,
    hasDates,
    quote,
    loading: hasDates && isPending && !error,
    errorMessage,
    isOwner: user?.id === listing.host.id,
    reserve,
  };
}
