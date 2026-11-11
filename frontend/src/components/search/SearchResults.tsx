"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { List, Map as MapIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ListingCard } from "@/components/listing/ListingCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCurrentSearch } from "@/hooks/useCurrentSearch";
import { useWishlists } from "@/hooks/useWishlists";
import { api } from "@/lib/api";
import { listingsQuery, NO_FILTERS, type Filters } from "@/lib/listings-query";
import { searchHref, toQuery, type SearchParams } from "@/lib/search-params";
import type { Amenity, ListingCard as Listing, Page } from "@/lib/types";
import { FilterChips } from "./FilterChips";
import { FiltersModal } from "./FiltersModal";
import { Pagination } from "./Pagination";

// Leaflet touches `window`, so the map is only ever loaded in the browser.
const ListingsMap = dynamic(() => import("@/components/map/ListingsMap").then((m) => m.ListingsMap), {
  ssr: false,
  loading: () => <div className="size-full bg-bebe" />,
});

export function SearchResults() {
  const router = useRouter();
  const search = useCurrentSearch();
  const { savedMap } = useWishlists();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false); // mobile only: the map is a full-screen overlay
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const page = Math.max(1, search.page ?? 1); // ?page=0 reads as page 1
  const query = listingsQuery(search, page);
  const { data, isPending, isError, isPlaceholderData, refetch } = useQuery({
    queryKey: ["search", query],
    queryFn: () => api<Page<Listing>>(`/api/listings?${query}`),
    placeholderData: keepPreviousData, // keep the old results (dimmed) while a filter change loads
  });
  const { data: amenities = [] } = useQuery({
    queryKey: ["amenities"],
    queryFn: () => api<Amenity[]>("/api/amenities"),
    staleTime: Infinity,
  });
  const amenityNames = useMemo(() => Object.fromEntries(amenities.map((a) => [a.slug, a.name])), [amenities]);
  const savedIds = useMemo(() => new Set(Object.keys(savedMap).map(Number)), [savedMap]);

  // The URL is the single source of truth: every change writes it, and the page just reads it back.
  function go(patch: Partial<SearchParams>, push = false) {
    const href = searchHref({ ...search, page: undefined, ...patch });
    if (push) router.push(href, { scroll: false });
    else router.replace(href, { scroll: false });
  }
  const setFilters = (patch: Partial<Filters>) => go(patch);

  // Dates and guests ride along to the listing page; filters do not.
  const roomQuery = toQuery({ ...search, ...NO_FILTERS, pets: search.pets, page: undefined });
  const hrefFor = (id: number) => `/rooms/${id}${roomQuery ? `?${roomQuery}` : ""}`;

  // A stale or hand-edited ?page=99: jump to the last real page instead of showing a false empty state.
  const lastPage = data && !isPlaceholderData && data.pages > 0 && page > data.pages ? data.pages : null;
  useEffect(() => {
    if (lastPage) router.replace(searchHref({ ...search, page: lastPage }), { scroll: false });
  });

  const items = lastPage ? [] : (data?.items ?? []);
  const total = data?.total ?? 0;
  const heading = isPending
    ? null
    : `${total} ${total === 1 ? "home" : "homes"}${search.location ? ` in ${search.location}` : ""}`;

  return (
    <div className="px-6 md:px-10">
      <FilterChips filters={search} amenityNames={amenityNames} onChange={setFilters} onOpenFilters={() => setFiltersOpen(true)} />

      <div className="flex items-start gap-6">
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex items-center justify-between gap-4">
            {heading ? <h1 className="text-base font-semibold">{heading}</h1> : <Skeleton className="h-5 w-48 rounded-8" />}
            <span className="hidden shrink-0 rounded-pill bg-faint px-3 py-1.5 text-label md:block">Prices include all fees</span>
          </div>

          {isError ? (
            <div className="flex flex-col items-center gap-3 py-24 text-center">
              <p className="text-section">Something went wrong</p>
              <p className="text-secondary">We could not load the homes. Please try again.</p>
              <button type="button" onClick={() => refetch()} className="mt-2 h-12 rounded-8 bg-hof px-6 text-button text-white hover:bg-black">
                Try again
              </button>
            </div>
          ) : isPending ? (
            <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 2xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i}>
                  <Skeleton className="aspect-[4/3] w-full rounded-20" />
                  <Skeleton className="mt-3 h-4 w-3/4 rounded-8" />
                  <Skeleton className="mt-2 h-4 w-1/2 rounded-8" />
                  <Skeleton className="mt-2 h-4 w-1/3 rounded-8" />
                </div>
              ))}
            </div>
          ) : lastPage ? (
            <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 2xl:grid-cols-3">
              <Skeleton className="aspect-[4/3] w-full rounded-20" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-24 text-center md:text-left">
              <p className="text-section font-semibold">No exact matches</p>
              <p className="mt-2 text-secondary">Try changing or removing some of your search filters or adjusting your search area.</p>
            </div>
          ) : (
            <div className={`grid grid-cols-1 gap-x-6 gap-y-8 transition-opacity sm:grid-cols-2 2xl:grid-cols-3 ${isPlaceholderData ? "opacity-50" : ""}`}>
              {items.map((l) => (
                <ListingCard key={l.id} listing={l} variant="grid" href={hrefFor(l.id)} onHover={setHoveredId} />
              ))}
            </div>
          )}

          {data && !isError && !lastPage && (
            <Pagination
              page={page}
              pages={data.pages}
              onPage={(p) => {
                go({ page: p }, true);
                window.scrollTo({ top: 0 });
              }}
            />
          )}
        </div>

        {/* One map: a sticky column from 950px up, a full-screen overlay on phones once "Map" is tapped. */}
        <div
          className={`${mapOpen ? "fixed inset-0 z-[45] bg-white" : "hidden"} lg:sticky lg:inset-x-auto lg:top-[97px] lg:bottom-auto lg:z-0 lg:block lg:h-[calc(100vh-113px)] lg:w-[40%] lg:shrink-0 lg:overflow-hidden lg:rounded-20 lg:border lg:border-bebe`}
        >
          <ListingsMap listings={items} hoveredId={hoveredId} savedIds={savedIds} hrefFor={hrefFor} />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setMapOpen(!mapOpen)}
        className="fixed bottom-20 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-pill bg-hof px-5 py-3 text-tab text-white shadow-secondary lg:hidden"
      >
        {mapOpen ? <List size={16} /> : <MapIcon size={16} />}
        {mapOpen ? "List" : "Map"}
      </button>

      {filtersOpen && (
        <FiltersModal
          search={search}
          onClose={() => setFiltersOpen(false)}
          onApply={(f) => {
            setFiltersOpen(false);
            go(f);
          }}
        />
      )}
    </div>
  );
}
