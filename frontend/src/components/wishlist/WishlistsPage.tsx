"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useAuthModal } from "@/components/layout/AuthModal";
import { Button, buttonStyles } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import type { Wishlist } from "@/lib/types";

export function StartSearching({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={buttonStyles("dark", "md", className)}>
      Start searching
    </Link>
  );
}

export function WishlistsPage() {
  const { user, isLoading } = useAuth();
  const authModal = useAuthModal();
  // Same key as the provider's query, so the two share one cache entry.
  const { data, isError, refetch } = useQuery({
    queryKey: ["wishlists"],
    queryFn: () => api<Wishlist[]>("/api/wishlists"),
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-9 w-40 rounded-8" />
      </div>
    );
  }
  if (!user) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-24 text-center">
        <h1 className="text-section">Log in to view your wishlists</h1>
        <p className="text-secondary">You can create, view or edit wishlists once you have logged in.</p>
        <Button variant="primary" className="mt-2" onClick={() => authModal.open("Log in to view your wishlists")}>
          Log in
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] px-6 pt-8 pb-16 lg:px-10">
      <h1 className="text-[32px] leading-10 font-medium">Wishlists</h1>
      <div className="mt-8">
        {isError ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-section">Something went wrong</p>
            <p className="text-secondary">We could not load your wishlists.</p>
            <Button onClick={() => refetch()}>Try again</Button>
          </div>
        ) : !data ? (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="aspect-square w-full rounded-20" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="py-8">
            <h2 className="text-section font-semibold">Create your first wishlist</h2>
            <p className="mt-2 max-w-md text-secondary">
              As you search, click the heart icon to save your favourite places and Experiences to a wishlist.
            </p>
            <StartSearching className="mt-6" />
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
            {data.map((w) => (
              <li key={w.id}>
                <Link href={`/wishlists/${w.id}`} className="block">
                  <Cover photos={w.cover_photos} />
                  <p className="mt-2 truncate font-medium">{w.name}</p>
                  <p className="text-secondary">{w.count} saved</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** One photo fills the square; two or more make a 2x2 collage with grey empty slots. */
function Cover({ photos }: { photos: string[] }) {
  const shown = photos.slice(0, 4);
  return (
    <div className="aspect-square overflow-hidden rounded-20 bg-bebe">
      {shown.length === 1 ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={shown[0]} alt="" className="size-full object-cover" />
      ) : (
        <div className="grid size-full grid-cols-2 grid-rows-2 gap-0.5">
          {[0, 1, 2, 3].map((i) =>
            shown[i] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={shown[i]} alt="" className="size-full object-cover" />
            ) : (
              <div key={i} className="bg-bebe" />
            ),
          )}
        </div>
      )}
    </div>
  );
}
