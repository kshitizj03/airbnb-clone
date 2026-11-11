"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { ErrorState } from "@/components/trips/shared";
import { buttonStyles } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { placeName } from "@/lib/format";
import type { HostListingCard } from "@/lib/types";

export function HostListingsPage() {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["host", "listings"],
    queryFn: () => api<HostListingCard[]>("/api/host/listings"),
    enabled: !!user,
  });

  if (isError) return <ErrorState message="We could not load your listings." onRetry={() => refetch()} />;

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 md:px-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-[28px] leading-8 font-medium">Your listings</h1>
        <Link href="/become-a-host" aria-label="Create a listing" className="flex size-10 items-center justify-center rounded-full bg-quaternary hover:bg-bebe">
          <Plus size={20} />
        </Link>
      </div>

      {isLoading || !data ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square w-full rounded-16" />
              <Skeleton className="h-4 w-3/4 rounded-4" />
              <Skeleton className="h-4 w-1/2 rounded-4" />
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <p className="text-section">You don&apos;t have any listings yet</p>
          <p className="text-secondary">Create a listing to start welcoming guests.</p>
          <Link href="/become-a-host" className={buttonStyles("dark", "md", "mt-2")}>
            Create your first listing
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.map((l) => (
            <li key={l.id} className="group relative">
              <div className="relative aspect-square overflow-hidden rounded-16 bg-bebe">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.photos[0]} alt="" loading="lazy" className="size-full object-cover" />
                <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-pill bg-elevated px-2.5 py-1 text-label shadow-elevation1">
                  <span className="size-2 rounded-full bg-spruce" aria-hidden /> Listed
                </span>
              </div>
              <Link href={`/hosting/listings/${l.id}/edit`} className="mt-2 block text-card after:absolute after:inset-0 after:content-['']">
                {l.title}
              </Link>
              <p className="text-card-home font-normal text-secondary">
                Home in {placeName(l.city, l.state)}
              </p>
              <p className="text-label font-normal text-secondary">{l.upcoming_bookings} upcoming</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
