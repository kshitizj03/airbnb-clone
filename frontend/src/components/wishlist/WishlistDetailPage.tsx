"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, MoreHorizontal } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ListingCard } from "@/components/listing/ListingCard";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/trips/shared";
import { useAuth } from "@/hooks/useAuth";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { api, ApiError } from "@/lib/api";
import type { WishlistDetail } from "@/lib/types";
import { StartSearching, WishlistLogin } from "./WishlistsPage";

// Leaflet touches `window`, so the map is only ever loaded in the browser.
const ListingsMap = dynamic(() => import("@/components/map/ListingsMap").then((m) => m.ListingsMap), {
  ssr: false,
  loading: () => <div className="size-full bg-bebe" />,
});

export function WishlistDetailPage({ id }: { id: string }) {
  const { user, isLoading } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Escape closes the menu and puts focus back on the button that opened it.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenuOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Under ["wishlists"], so the heart flow's settle() (which invalidates that prefix) refetches this after every un-heart.
  const { data, error, refetch } = useQuery({
    queryKey: ["wishlists", id],
    queryFn: () => api<WishlistDetail>(`/api/wishlists/${id}`),
    enabled: !!user,
    retry: false,
  });

  const remove = useMutation({
    mutationFn: () => api(`/api/wishlists/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      // exact: refetching this deleted list would 404. The hearts of its homes must empty too.
      qc.invalidateQueries({ queryKey: ["wishlists"], exact: true });
      qc.invalidateQueries({ queryKey: ["wishlist-saved"] });
      toast.success("Wishlist deleted");
      router.replace("/wishlists");
    },
    onError: (e) => {
      toast.error(e instanceof ApiError ? e.message : "Could not delete. Please try again.");
      setConfirmOpen(false);
    },
  });

  const items = useMemo(() => data?.items ?? [], [data]);
  const savedIds = useMemo(() => new Set(items.map((l) => l.id)), [items]);

  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-9 w-40 rounded-8" />
      </div>
    );
  }
  if (!user) return <WishlistLogin />;
  if (error instanceof ApiError && (error.status === 404 || error.status === 422)) notFound();
  if (error) return <ErrorState message="We could not load this wishlist." onRetry={() => refetch()} />;

  return (
    <div className="mx-auto flex max-w-[1760px] px-6 pb-12 lg:gap-6 lg:px-10">
      <div className="min-w-0 flex-1 pt-6">
        <div className="flex items-center justify-between">
          <Link href="/wishlists" aria-label="Back to wishlists" className="flex size-8 items-center justify-center rounded-full hover:bg-faint">
            <ChevronLeft size={20} />
          </Link>
          <div className="relative">
            <button
              ref={triggerRef}
              type="button"
              aria-label="Wishlist options"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
              className="flex size-8 items-center justify-center rounded-full hover:bg-faint"
            >
              <MoreHorizontal size={20} />
            </button>
            {menuOpen && (
              <>
                {/* Click anywhere else closes the menu. */}
                <button type="button" aria-label="Close menu" tabIndex={-1} className="fixed inset-0 z-10 cursor-default" onClick={() => setMenuOpen(false)} />
                <div role="menu" className="absolute right-0 z-20 mt-1 w-48 rounded-12 bg-white py-2 shadow-elevation2">
                  <button
                    type="button"
                    role="menuitem"
                    autoFocus
                    className="w-full px-4 py-2 text-left hover:bg-faint"
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmOpen(true);
                    }}
                  >
                    Delete wishlist
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {data ? <h1 className="mt-4 text-[32px] leading-10 font-medium">{data.name}</h1> : <Skeleton className="mt-4 h-10 w-56 rounded-8" />}

        <div className="mt-6">
          {!data ? (
            <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="aspect-[4/3] w-full rounded-20" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="py-8">
              <h2 className="text-section font-semibold">No saves yet</h2>
              <p className="mt-2 text-secondary">As you search, click the heart icon to save places to this wishlist.</p>
              <StartSearching className="mt-6" />
            </div>
          ) : (
            <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2">
              {items.map((l) => (
                <ListingCard key={l.id} listing={l} variant="grid" />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mounted only on desktop, so phones never download or build the map. */}
      {isDesktop && (
        <div className="sticky top-[97px] h-[calc(100vh-113px)] w-[40%] shrink-0 overflow-hidden rounded-20 border border-bebe lg:mt-6">
          <ListingsMap listings={items} hoveredId={null} savedIds={savedIds} />
        </div>
      )}

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete this wishlist?"
        size="sm"
        footer={
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button disabled={remove.isPending} onClick={() => remove.mutate()}>
              Delete
            </Button>
          </div>
        }
      >
        <p className="p-6 text-secondary">This wishlist and its saved homes will be removed. This cannot be undone.</p>
      </Modal>
    </div>
  );
}
