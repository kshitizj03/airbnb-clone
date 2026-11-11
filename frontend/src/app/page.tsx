"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { ListingCard } from "@/components/listing/ListingCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { searchHref } from "@/lib/search-params";
import type { ListingCard as Listing, Page } from "@/lib/types";

const CITIES = ["Goa", "Jaipur", "Manali", "Udaipur", "Mumbai", "Bengaluru"];

const roundBtn =
  "flex size-8 items-center justify-center rounded-full border border-deco bg-surface hover:scale-105 hover:shadow-elevation1 disabled:cursor-default disabled:opacity-30 disabled:hover:scale-100 disabled:hover:shadow-none";

function CityRow({ city }: { city: string }) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["home-row", city],
    queryFn: async () => (await api<Page<Listing>>(`/api/listings?location=${encodeURIComponent(city)}&page=1`)).items.slice(0, 8),
  });
  const track = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  function onScroll() {
    const el = track.current!;
    setEdge({ start: el.scrollLeft < 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }
  const scroll = (dir: -1 | 1) =>
    track.current!.scrollBy({ left: dir * track.current!.clientWidth * 0.8, behavior: "smooth" });

  return (
    <section className="mt-8 first:mt-6">
      <div className="mb-3 flex items-center justify-between">
        <Link
          href={searchHref({ location: city, adults: 0, children: 0, infants: 0, pets: 0, propertyTypes: [], amenities: [] })}
          className="flex items-center gap-2 text-row"
        >
          Popular homes in {city}
          <span className="flex size-6 items-center justify-center rounded-full bg-quaternary">
            <ArrowRight size={14} />
          </span>
        </Link>
        <div className="hidden gap-2 md:flex">
          <button type="button" aria-label={`Scroll ${city} homes left`} disabled={edge.start} onClick={() => scroll(-1)} className={roundBtn}>
            <ChevronLeft size={16} />
          </button>
          <button type="button" aria-label={`Scroll ${city} homes right`} disabled={edge.end} onClick={() => scroll(1)} className={roundBtn}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {isError ? (
        <div className="flex h-[220px] flex-col items-center justify-center gap-3 rounded-20 bg-faint">
          <p className="font-medium">Couldn&apos;t load homes</p>
          <button type="button" onClick={() => refetch()} className="rounded-8 border border-hof px-4 py-2 font-medium hover:bg-surface">
            Try again
          </button>
        </div>
      ) : (
        <div
          ref={track}
          onScroll={onScroll}
          className="flex snap-x gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {isPending
            ? Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="w-[180px] shrink-0">
                  <Skeleton className="aspect-[180/171] rounded-20" />
                  <Skeleton className="mt-2 h-4 w-28 rounded-4" />
                  <Skeleton className="mt-1 h-3 w-20 rounded-4" />
                </div>
              ))
            : data.map((l) => <ListingCard key={l.id} listing={l} variant="row" />)}
        </div>
      )}
    </section>
  );
}

export default function Home() {
  return (
    <div className="mx-auto max-w-[1760px] px-4 py-4 pb-20 md:px-12">
      {CITIES.map((c) => (
        <CityRow key={c} city={c} />
      ))}
    </div>
  );
}
