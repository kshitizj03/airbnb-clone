"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { createContext, useContext, useRef, useState, type ReactNode } from "react";
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

const SAVED_KEY = ["wishlist-saved"]; // not under ["wishlists"], so invalidating the lists never touches it
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

  // Listings with a request in flight: further clicks on them are ignored.
  const pending = useRef(new Set<number>());
  async function guarded(listingId: number, fn: () => Promise<void>) {
    if (pending.current.has(listingId)) return;
    pending.current.add(listingId);
    try {
      await fn();
    } finally {
      pending.current.delete(listingId);
    }
  }
  // Stop an in-flight refetch from overwriting the optimistic write, then write it.
  async function setSaved(listingId: number, wishlistId: number | undefined) {
    await qc.cancelQueries({ queryKey: SAVED_KEY });
    qc.setQueryData<SavedMap>(SAVED_KEY, (old = {}) => {
      const next = { ...old };
      if (wishlistId === undefined) delete next[listingId];
      else next[listingId] = wishlistId;
      return next;
    });
  }
  // After a request settles, re-read the truth from the server (also undoes any half-finished change).
  const settle = () => {
    qc.invalidateQueries({ queryKey: SAVED_KEY });
    qc.invalidateQueries({ queryKey: LISTS_KEY }); // counts, covers and order changed
  };

  /** Save into an existing list (by id) or a brand new one (by name); moves it if it was saved elsewhere. */
  function saveTo(listing: ListingCard, target: number | string) {
    return guarded(listing.id, async () => {
      const old = savedMap[listing.id];
      // Fill the heart now. A new list has no id yet, so 0 just means "saved" (never sent to the server).
      await setSaved(listing.id, typeof target === "number" ? target : 0);
      try {
        // Add to the new list first: if that fails nothing has changed on the server.
        const wl =
          typeof target === "string"
            ? await api<Wishlist>("/api/wishlists", { method: "POST", json: { name: target, listing_id: listing.id } })
            : await api<Wishlist>(`/api/wishlists/${target}/items`, { method: "POST", json: { listing_id: listing.id } });
        await setSaved(listing.id, wl.id);
        if (old !== undefined && old !== wl.id) await api(`/api/wishlists/${old}/items/${listing.id}`, { method: "DELETE" });
        showToast(listing, `Saved to ${wl.name}`, true);
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Could not save. Please try again.");
      } finally {
        settle(); // the refetch also restores the right heart after a failure
      }
    });
  }

  function remove(listing: ListingCard, wishlistId: number) {
    return guarded(listing.id, async () => {
      const name = lists?.find((w) => w.id === wishlistId)?.name ?? "wishlist";
      await setSaved(listing.id, undefined);
      try {
        await api(`/api/wishlists/${wishlistId}/items/${listing.id}`, { method: "DELETE" });
        showToast(listing, `Removed from ${name}`, false);
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Could not remove. Please try again.");
      } finally {
        settle();
      }
    });
  }

  async function toggle(listing: ListingCard) {
    if (!user) return authModal.open("Log in to save homes to a wishlist");
    if (pending.current.has(listing.id)) return;
    const saved = savedMap[listing.id];
    if (saved !== undefined) return remove(listing, saved);
    pending.current.add(listing.id); // held while we may have to load the lists
    let all: Wishlist[];
    try {
      all = lists ?? (await qc.fetchQuery({ queryKey: LISTS_KEY, queryFn: fetchLists }));
    } catch {
      toast.error("Could not load your wishlists. Please try again.");
      return;
    } finally {
      pending.current.delete(listing.id);
    }
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
