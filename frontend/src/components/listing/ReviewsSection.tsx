"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { CircleCheck, Key, MapPin, MessageSquare, Sparkles, Star, Tag, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import type { ListingDetail, Page, RatingBreakdown, Review } from "@/lib/types";

type Sort = "relevant" | "recent" | "highest" | "lowest";
const SORTS: [Sort, string][] = [
  ["relevant", "Most relevant"],
  ["recent", "Most recent"],
  ["highest", "Highest rated"],
  ["lowest", "Lowest rated"],
];
const CATEGORIES: [keyof RatingBreakdown, string, LucideIcon][] = [
  ["cleanliness", "Cleanliness", Sparkles],
  ["accuracy", "Accuracy", CircleCheck],
  ["checkin", "Check-in", Key],
  ["communication", "Communication", MessageSquare],
  ["location", "Location", MapPin],
  ["value", "Value", Tag],
];

const reviewsUrl = (id: number, sort: Sort, page: number) =>
  `/api/listings/${id}/reviews?page=${page}&sort=${sort === "relevant" ? "recent" : sort}`; // no relevance score yet: recent stands in

export const ratingLine = (l: ListingDetail) => (l.review_count === 0 || l.rating === null ? "New" : l.rating.toFixed(2));

/** "★ 4.45 · 11 reviews" or "★ New · No reviews yet" */
export function ratingHeading(l: ListingDetail) {
  return l.review_count === 0 ? `${ratingLine(l)} · No reviews yet` : `${ratingLine(l)} · ${l.review_count} review${l.review_count === 1 ? "" : "s"}`;
}

/** Overall bars (5 stars to 1) and the six category scores. */
function Summary({ listing, big }: { listing: ListingDetail; big?: boolean }) {
  const rb = listing.rating_breakdown;
  const total = Object.values(rb.distribution).reduce((a, b) => a + b, 0) || 1;
  return (
    <div className={`flex flex-col gap-8 ${big ? "" : "lg:flex-row lg:items-stretch lg:gap-0"}`}>
      <div className={big ? "" : "lg:w-[220px] lg:shrink-0 lg:pr-6"}>
        <p className="mb-3 text-sm font-medium">Overall rating</p>
        {[5, 4, 3, 2, 1].map((s) => (
          <div key={s} className="flex items-center gap-2 text-xs">
            <span className="w-2">{s}</span>
            <div className="h-1 flex-1 rounded-full bg-bebe">
              <div className="h-full rounded-full bg-hof" style={{ width: `${((rb.distribution[String(s)] ?? 0) / total) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className={`grid grid-cols-3 gap-y-6 ${big ? "" : "lg:flex lg:flex-1"}`}>
        {CATEGORIES.map(([key, name, Icon]) => (
          <div key={key} className={`flex flex-col justify-between gap-2 ${big ? "" : "lg:flex-1 lg:border-l lg:border-bebe lg:px-6"}`}>
            <div>
              <p className="text-sm font-medium">{name}</p>
              <p className="text-section">{typeof rb[key] === "number" ? (rb[key] as number).toFixed(1) : "-"}</p>
            </div>
            <Icon size={32} strokeWidth={1.25} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Only the modal copy carries the id: the preview cards on the page would otherwise be found first.
function ReviewCard({ r, clamp, onMore, withId }: { r: Review; clamp?: boolean; onMore?: () => void; withId?: boolean }) {
  const years = new Date().getFullYear() - r.author_joined_year;
  return (
    <article id={withId ? `review-${r.id}` : undefined} className="scroll-mt-4">
      <div className="flex items-center gap-3">
        <Avatar name={r.author_name} src={r.author_avatar_url} size={48} />
        <div>
          <p className="text-base font-medium">{r.author_name}</p>
          <p className="text-sm text-secondary">{years >= 1 ? `${years} year${years === 1 ? "" : "s"} on Airbnb` : "New to Airbnb"}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1 text-sm">
        <span className="flex" aria-label={`Rated ${r.rating} out of 5`}>
          {Array.from({ length: r.rating }, (_, i) => (
            <Star key={i} size={10} className="fill-current" />
          ))}
        </span>
        <span>· {format(parseISO(r.created_at), "MMMM yyyy")}</span>
      </div>
      <p className={`mt-2 text-base ${clamp ? "line-clamp-3" : ""}`}>{r.comment}</p>
      {clamp && r.comment.length > 150 && (
        <button type="button" onClick={onMore} className="mt-2 text-base font-medium underline">
          Show more
        </button>
      )}
    </article>
  );
}

export function ReviewsSection({ listing, onShowAll, onShowReview }: { listing: ListingDetail; onShowAll: () => void; onShowReview: (id: number) => void }) {
  const { data, isPending } = useQuery({
    queryKey: ["reviews-preview", listing.id],
    queryFn: () => api<Page<Review>>(reviewsUrl(listing.id, "recent", 1)),
    enabled: listing.review_count > 0,
  });

  return (
    <section id="reviews" className="scroll-mt-40 border-b border-bebe py-8">
      <h2 className="flex items-center gap-2 text-section">
        <Star size={20} className="fill-current" /> {ratingHeading(listing)}
      </h2>
      {listing.review_count > 0 && (
        <>
          <div className="mt-8">
            <Summary listing={listing} />
          </div>
          <div className="mt-10 grid grid-cols-1 gap-x-20 gap-y-10 md:grid-cols-2">
            {isPending
              ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28 rounded-12" />)
              : data?.items.slice(0, 6).map((r) => <ReviewCard key={r.id} r={r} clamp onMore={() => onShowReview(r.id)} />)}
          </div>
          <button type="button" onClick={onShowAll} className="mt-10 h-12 rounded-8 border border-hof px-6 text-base font-medium hover:bg-faint max-md:w-full">
            Show all {listing.review_count} reviews
          </button>
        </>
      )}
    </section>
  );
}

/** ?modal=reviews: rating summary, sort, every review 10 at a time. ?review=<id> scrolls to that review. */
export function ReviewsModal({ listing, focusId, onClose }: { listing: ListingDetail; focusId: number | null; onClose: () => void }) {
  const [sort, setSort] = useState<Sort>("relevant");
  const { data, isPending, isError, hasNextPage, fetchNextPage, isFetchingNextPage, refetch } = useInfiniteQuery({
    queryKey: ["reviews", listing.id, sort],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => api<Page<Review>>(reviewsUrl(listing.id, sort, pageParam)),
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
  });
  const reviews = data?.pages.flatMap((p) => p.items) ?? [];

  // Opened from a card's "Show more": bring that review into view once.
  const loaded = reviews.length > 0;
  useEffect(() => {
    if (focusId && loaded) document.getElementById(`review-${focusId}`)?.scrollIntoView({ block: "start" });
  }, [focusId, loaded]);

  return (
    <Modal open onClose={onClose} title={ratingHeading(listing)} size="lg">
      <div className="p-6 md:p-8">
        <Summary listing={listing} big />
        <div className="mt-8 flex items-center justify-between border-t border-bebe pt-6">
          <h3 className="text-section">
            {listing.review_count} review{listing.review_count === 1 ? "" : "s"}
          </h3>
          <select
            aria-label="Sort reviews"
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="h-10 rounded-pill border border-deco bg-white px-4 text-sm font-medium"
          >
            {SORTS.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {isError ? (
          <div className="py-10 text-center">
            <p>Could not load reviews.</p>
            <button type="button" onClick={() => refetch()} className="mt-3 font-medium underline">
              Try again
            </button>
          </div>
        ) : isPending ? (
          <div className="mt-6 space-y-6">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-28 rounded-12" />
            ))}
          </div>
        ) : (
          <div className="mt-6 space-y-8">
            {reviews.map((r) => (
              <ReviewCard key={r.id} r={r} withId />
            ))}
          </div>
        )}
        {hasNextPage && (
          <button
            type="button"
            disabled={isFetchingNextPage}
            onClick={() => fetchNextPage()}
            className="mt-8 h-12 w-full rounded-8 border border-hof text-base font-medium hover:bg-faint disabled:opacity-50"
          >
            {isFetchingNextPage ? "Loading..." : "Show more reviews"}
          </button>
        )}
      </div>
    </Modal>
  );
}
