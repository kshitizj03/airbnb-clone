"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { createContext, useContext, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useAuthModal } from "@/components/layout/AuthModal";
import { CreateWishlistModal } from "@/components/wishlist/CreateWishlistModal";
import { SaveToWishlistModal } from "@/components/wishlist/SaveToWishlistModal";
import { api, ApiError } from "@/lib/api";
import type { ListingCard, Wishlist } from "@/lib/types";
import { useAuth } from "./useAuth";

type SavedMap = Record<number, number>; // listing id -> wishlist id

interface Value {
  savedMap: SavedMap;
  toggle: (listing: ListingCard) => void;
}
const WishlistContext = createContext<Value | null>(null);

export function useWishlists() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlists must be used inside <WishlistProvider>");
  return ctx;
}

const SAVED_KEY = ["wishlists", "saved"];
const LISTS_KEY = ["wishlists"];
const fetchLists = () => api<Wishlist[]>("/api/wishlists");

/** One provider owns the queries and the two modals, so every heart on the page shares them. */
export function WishlistProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const authModal = useAuthModal();
  // Logged-out users get no requests (they would 401); logout resets these queries.
  const { data: savedMap = {} } = useQuery({
    queryKey: SAVED_KEY,
    queryFn: () => api<SavedMap>("/api/wishlists/saved"),
    enabled: !!user,
  });
  const { data: lists } = useQuery({ queryKey: LISTS_KEY, queryFn: fetchLists, enabled: !!user });
  // Which listing the open modal is about.
  const [createFor, setCreateFor] = useState<ListingCard | null>(null);
  const [pickFor, setPickFor] = useState<ListingCard | null>(null);

  const setSaved = (listingId: number, wishlistId: number | undefined) =>
    qc.setQueryData<SavedMap>(SAVED_KEY, (old = {}) => {
      const next = { ...old };
      if (wishlistId === undefined) delete next[listingId];
      else next[listingId] = wishlistId;
      return next;
    });

  function showToast(listing: ListingCard, text: string, canChange: boolean) {
    toast.custom(
      (id) => (
        <div className="flex h-[66px] w-[375px] max-w-full items-center gap-3 rounded-12 bg-white p-3 shadow-secondary">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={listing.photos[0]} alt="" className="size-10 rounded-8 object-cover" />
          <span className="flex-1 truncate text-tab">{text}</span>
          {canChange && (
            <button
              type="button"
              className="text-tab font-semibold underline"
              onClick={() => {
                toast.dismiss(id);
                setPickFor(listing);
              }}
            >
              Change
            </button>
          )}
        </div>
      ),
      { duration: 4000 },
    );
  }

  /** Save into an existing list (by id) or a brand new one (by name); moves it if it was saved elsewhere. */
  async function saveTo(listing: ListingCard, target: number | string) {
    const old = savedMap[listing.id];
    // Fill the heart now. A new list has no id yet, so 0 just means "saved".
    setSaved(listing.id, typeof target === "number" ? target : 0);
    try {
      if (old !== undefined) await api(`/api/wishlists/${old}/items/${listing.id}`, { method: "DELETE" });
      const wl =
        typeof target === "string"
          ? await api<Wishlist>("/api/wishlists", { method: "POST", json: { name: target, listing_id: listing.id } })
          : await api<Wishlist>(`/api/wishlists/${target}/items`, { method: "POST", json: { listing_id: listing.id } });
      setSaved(listing.id, wl.id);
      showToast(listing, `Saved to ${wl.name}`, true);
    } catch (e) {
      setSaved(listing.id, old); // roll back
      toast.error(e instanceof ApiError ? e.message : "Could not save. Please try again.");
    } finally {
      qc.invalidateQueries({ queryKey: LISTS_KEY }); // counts, covers and order changed
    }
  }

  async function remove(listing: ListingCard, wishlistId: number) {
    const name = lists?.find((w) => w.id === wishlistId)?.name ?? "wishlist";
    setSaved(listing.id, undefined);
    try {
      await api(`/api/wishlists/${wishlistId}/items/${listing.id}`, { method: "DELETE" });
      showToast(listing, `Removed from ${name}`, false);
    } catch (e) {
      setSaved(listing.id, wishlistId);
      toast.error(e instanceof ApiError ? e.message : "Could not remove. Please try again.");
    } finally {
      qc.invalidateQueries({ queryKey: LISTS_KEY });
    }
  }

  async function toggle(listing: ListingCard) {
    if (!user) return authModal.open("Log in to save homes to a wishlist");
    const saved = savedMap[listing.id];
    if (saved !== undefined) return remove(listing, saved);
    const all: Wishlist[] = lists ?? (await qc.fetchQuery({ queryKey: LISTS_KEY, queryFn: fetchLists }));
    if (all.length === 0) setCreateFor(listing);
    else saveTo(listing, all[0].id); // most recently updated first
  }

  return (
    <WishlistContext.Provider value={{ savedMap, toggle }}>
      {children}
      {createFor && (
        <CreateWishlistModal
          initialName={`${createFor.city} ${format(new Date(), "yyyy")}`}
          onClose={() => setCreateFor(null)}
          onCreate={(name) => {
            saveTo(createFor, name);
            setCreateFor(null);
          }}
        />
      )}
      {pickFor && (
        <SaveToWishlistModal
          lists={lists ?? []}
          onClose={() => setPickFor(null)}
          onPick={(w) => {
            if (savedMap[pickFor.id] !== w.id) saveTo(pickFor, w.id);
            setPickFor(null);
          }}
          onCreateNew={() => {
            setCreateFor(pickFor);
            setPickFor(null);
          }}
        />
      )}
    </WishlistContext.Provider>
  );
}
