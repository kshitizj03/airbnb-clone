"use client";

import { format } from "date-fns";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { parseSearchParams, type Guests } from "@/lib/search-params";

export type RoomModal = "photos" | "amenities" | "reviews" | "description";
const MODALS: string[] = ["photos", "amenities", "reviews", "description"];

/** The listing page keeps its state in the URL: dates, guests, which modal is open, which photo. */
export function useRoomParams() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const p = parseSearchParams(sp);

  const checkIn = p.checkIn;
  const checkOut = p.checkIn ? p.checkOut : undefined; // a lone check-out means nothing
  // A stay needs one adult, so an empty search reads as 1 guest.
  const guests: Guests = { adults: p.adults || 1, children: p.children, infants: p.infants, pets: p.pets };
  const rawModal = sp.get("modal");
  const modal = MODALS.includes(rawModal ?? "") ? (rawModal as RoomModal) : null;
  const rawPhoto = sp.get("photo");
  const photo = rawPhoto !== null && /^\d+$/.test(rawPhoto) ? Number(rawPhoto) : null;
  const rawReview = Number(sp.get("review"));
  const review = Number.isInteger(rawReview) && rawReview > 0 ? rawReview : null;

  /** Merge into the current query string; undefined removes a key. */
  function set(patch: Record<string, string | number | undefined>) {
    const q = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) q.delete(k);
      else q.set(k, String(v));
    }
    const qs = q.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const day = (d?: Date) => (d ? format(d, "yyyy-MM-dd") : undefined);
  return {
    checkIn,
    checkOut,
    guests,
    modal,
    photo,
    review,
    set,
    setDates: (r: { from?: Date; to?: Date }) => set({ check_in: day(r.from), check_out: day(r.to) }),
    setGuests: (g: Guests) =>
      set({ adults: g.adults, children: g.children || undefined, infants: g.infants || undefined, pets: g.pets || undefined }),
    openModal: (m: RoomModal, extra: Record<string, string | number | undefined> = {}) => set({ modal: m, ...extra }),
    closeModal: () => set({ modal: undefined, photo: undefined, review: undefined }),
  };
}
