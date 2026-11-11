"use client";

import { useQuery } from "@tanstack/react-query";
import { parseISO } from "date-fns";
import { Ban, CalendarX, Heart, MapPin, PawPrint, Share, Star, Zap, type LucideIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useBooking } from "@/hooks/useBooking";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useRoomParams } from "@/hooks/useRoomParams";
import { useWishlists } from "@/hooks/useWishlists";
import { api, ApiError } from "@/lib/api";
import type { BookedRange } from "@/lib/date-range";
import { formatINR, placeName } from "@/lib/format";
import type { ListingDetail } from "@/lib/types";
import { AmenitiesModal, AmenitiesSection } from "./AmenitiesSection";
import { BookingCard, ReserveButton } from "./BookingCard";
import { CalendarPanel } from "./CalendarPanel";
import { HostRow, MeetHost } from "./HostSection";
import { PhotoMosaic } from "./PhotoMosaic";
import { PhotoTour } from "./PhotoTour";
import { ratingHeading, ReviewsModal, ReviewsSection } from "./ReviewsSection";
import { ShareModal } from "./ShareModal";

// Leaflet touches `window`, so the map is only ever loaded in the browser.
const LocationMap = dynamic(() => import("@/components/map/LocationMap").then((m) => m.LocationMap), {
  ssr: false,
  loading: () => <div className="size-full bg-bebe" />,
});

const KIND: Record<string, string> = { house: "home", flat: "flat", guest_house: "guest house", hotel: "hotel" };
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** "Entire flat in Goa, India" */
function overviewTitle(l: ListingDetail) {
  const kind = KIND[l.property_type] ?? "home";
  const what = l.place_type === "entire_home" ? `Entire ${kind}` : `${l.place_type === "private_room" ? "Private room" : "Shared room"} in ${kind}`;
  return `${what} in ${l.city}, ${l.country}`;
}

export function ListingPage({ id }: { id: string }) {
  const { data: listing, error, refetch } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => api<ListingDetail>(`/api/listings/${id}`),
    retry: false,
  });
  // A made-up or non-numeric id is a 404 page, like any unknown URL.
  if (error instanceof ApiError && (error.status === 404 || error.status === 422)) notFound();

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-24 text-center">
        <p className="text-section">Something went wrong</p>
        <p className="text-secondary">We could not load this place. Please try again.</p>
        <button type="button" onClick={() => refetch()} className="mt-2 h-12 rounded-8 bg-hof px-6 text-button text-on-hof hover:bg-hof-hover">
          Try again
        </button>
      </div>
    );
  }
  if (!listing) return <ListingSkeleton />;
  return <Listing listing={listing} />;
}

function Listing({ listing }: { listing: ListingDetail }) {
  const r = useRoomParams();
  const isMobile = useIsMobile();
  const { savedMap, toggle } = useWishlists();
  const [shareOpen, setShareOpen] = useState(false);
  const saved = savedMap[listing.id] !== undefined;

  const { data: availability } = useQuery({
    queryKey: ["availability", listing.id],
    queryFn: () => api<{ booked: { check_in: string; check_out: string }[] }>(`/api/listings/${listing.id}/availability`),
  });
  const booked = useMemo<BookedRange[]>(() => (availability?.booked ?? []).map((b) => [parseISO(b.check_in), parseISO(b.check_out)]), [availability]);
  const b = useBooking(listing);

  // Sticky nav: appears when the photos scroll out; shows price + Reserve once the booking card scrolls out too.
  const heroRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [heroGone, setHeroGone] = useState(false);
  const [cardGone, setCardGone] = useState(false);
  useEffect(() => {
    const watch = (el: Element | null, set: (gone: boolean) => void) => {
      if (!el) return () => {};
      const io = new IntersectionObserver(([e]) => set(!e.isIntersecting && e.boundingClientRect.bottom < 0));
      io.observe(el);
      return () => io.disconnect();
    };
    const stopHero = watch(heroRef.current, setHeroGone);
    const stopCard = watch(cardRef.current, setCardGone);
    return () => {
      stopHero();
      stopCard();
    };
  }, []);

  const description = listing.description;
  const hasAmenity = (slug: string) => listing.amenities.some((a) => a.slug === slug);
  // Up to three highlights, picked from what is true of this listing.
  type Highlight = [LucideIcon, string, string];
  const locationScore = listing.rating_breakdown.location ?? 0;
  const candidates: (Highlight | false)[] = [
    [CalendarX, "Free cancellation before check-in", "Cancel any time before your stay for a full refund."],
    listing.instant_book && [Zap, "Instant Book", "Book right away, no need to wait for the host."],
    locationScore >= 4.5 && [MapPin, "Great location", `Recent guests gave the location ${locationScore.toFixed(1)} out of 5.`],
    listing.pets_allowed && [PawPrint, "Pets welcome", "Bring your furry friends along."],
    hasAmenity("dedicated-workspace") && [Star, "Dedicated workspace", "A space that is great for working remotely."],
  ];
  const highlights = candidates.filter((h): h is Highlight => !!h).slice(0, 3);

  const scrollTo = "scroll-mt-40";
  return (
    <div className="mx-auto max-w-[1280px] px-6 md:px-10 xl:px-20">
      <title>{`${listing.title} - Airbnb clone`}</title>

      {heroGone && (
        <div className="fixed inset-x-0 top-[81px] z-30 hidden border-b border-bebe bg-surface md:block">
          <div className="mx-auto flex h-20 max-w-[1280px] items-center justify-between px-10 xl:px-20">
            <nav aria-label="Sections" className="flex gap-6 text-sm font-medium">
              {[["photos", "Photos"], ["amenities", "Amenities"], ["reviews", "Reviews"], ["location", "Location"]].map(([hash, label]) => (
                <a key={hash} href={`#${hash}`} className="py-7 hover:text-secondary">
                  {label}
                </a>
              ))}
            </nav>
            {cardGone && (
              <div className="flex items-center gap-6">
                <div className="text-sm">
                  {b.quote ? (
                    <>
                      <span className="text-base font-semibold">{formatINR(b.quote.total)}</span> for {plural(b.quote.nights, "night")}
                    </>
                  ) : (
                    <>
                      <span className="text-base font-semibold">{formatINR(listing.price_per_night)}</span> night
                    </>
                  )}
                  <span className="mt-0.5 flex items-center gap-1 text-xs">
                    <Star size={10} className="fill-current" /> {ratingHeading(listing)}
                  </span>
                </div>
                {!b.isOwner && <ReserveButton b={b} onCheck={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="px-8" />}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="hidden items-end justify-between gap-4 pt-6 pb-4 md:flex">
        <h1 className="text-listing-title">{listing.title}</h1>
        <div className="flex shrink-0 gap-1 text-sm font-medium">
          <button type="button" onClick={() => setShareOpen(true)} className="flex items-center gap-2 rounded-8 px-3 py-2 underline hover:bg-faint">
            <Share size={16} /> Share
          </button>
          <button type="button" aria-pressed={saved} onClick={() => toggle(listing)} className="flex items-center gap-2 rounded-8 px-3 py-2 underline hover:bg-faint">
            <Heart size={16} className={saved ? "fill-rausch stroke-rausch" : ""} /> {saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>

      <div ref={heroRef} id="photos" className="max-md:-mx-6">
        <div className="max-md:px-6">
          <PhotoMosaic listing={listing} onShare={() => setShareOpen(true)} />
        </div>
      </div>
      <h1 className="pt-4 text-center text-section md:hidden">{listing.title}</h1>

      <div className="grid gap-x-16 md:grid-cols-[minmax(0,1fr)_minmax(320px,33%)]">
        <div>
          <section className="border-b border-bebe py-8 max-md:text-center">
            <h2 className="text-section">{overviewTitle(listing)}</h2>
            <p className="mt-1 text-base">
              {plural(listing.max_guests, "guest")} · {plural(listing.bedrooms, "bedroom")} · {plural(listing.beds, "bed")} · {plural(listing.bathrooms, "bathroom")}
            </p>
            <p className="mt-1 flex items-center gap-1 text-base max-md:justify-center">
              <Star size={14} className="fill-current" />
              <a href="#reviews" className="font-medium underline">
                {ratingHeading(listing)}
              </a>
            </p>
          </section>

          <HostRow host={listing.host} />

          <section className="space-y-6 border-b border-bebe py-8">
            {highlights.map(([Icon, title, text]) => (
              <div key={title} className="flex gap-4">
                <Icon size={24} strokeWidth={1.5} className="mt-0.5 shrink-0" />
                <div>
                  <p className="text-base font-medium">{title}</p>
                  <p className="text-sm text-secondary">{text}</p>
                </div>
              </div>
            ))}
          </section>

          <section className="border-b border-bebe py-8">
            <p className="line-clamp-4 text-base whitespace-pre-line">{description}</p>
            {description.length > 220 && (
              <button type="button" onClick={() => r.openModal("description")} className="mt-3 text-base font-medium underline">
                Show more &gt;
              </button>
            )}
          </section>

          <AmenitiesSection listing={listing} onShowAll={() => r.openModal("amenities")} />

          <section className="py-8 max-md:border-b max-md:border-bebe">
            <CalendarPanel range={b.range} booked={booked} months={isMobile ? 1 : 2} city={listing.city} onChange={r.setDates} />
          </section>
        </div>

        {/* On phones BookingCard renders a fixed bottom bar instead, so this wrapper takes no space. */}
        <div ref={cardRef} className="md:sticky md:top-[150px] md:h-fit md:py-8">
          <BookingCard listing={listing} bookedRanges={booked} />
        </div>
      </div>

      <ReviewsSection listing={listing} onShowAll={() => r.openModal("reviews")} onShowReview={(id) => r.openModal("reviews", { review: id })} />

      <section id="location" className={`${scrollTo} border-b border-bebe py-8`}>
        <h2 className="text-section">Where you&apos;ll be</h2>
        <p className="mt-2 text-base">
          {placeName(listing.city, listing.state, listing.country)}
        </p>
        {/* isolate: Leaflet's panes use high z-indexes that would otherwise paint over the header. */}
        <div className="relative isolate mt-6 h-[320px] overflow-hidden rounded-16 md:h-[480px]" role="region" aria-label={`Map of ${listing.city}`}>
          <LocationMap latitude={listing.latitude} longitude={listing.longitude} />
        </div>
        <p className="mt-4 text-sm text-secondary">Exact location will be provided after booking.</p>
      </section>

      <MeetHost host={listing.host} />

      <section className="py-8 pb-24 md:pb-12">
        <h2 className="text-section">Things to know</h2>
        <div className="mt-6 grid gap-8 md:grid-cols-3">
          <Rule title="House rules" lines={["Check-in after 3:00 pm", "Checkout before 11:00 am", `${plural(listing.max_guests, "guest")} maximum`, listing.pets_allowed ? "Pets allowed" : "No pets"]} />
          <Rule
            title="Safety and property"
            lines={[
              hasAmenity("carbon-monoxide-alarm") ? "Carbon monoxide alarm" : "No carbon monoxide alarm",
              hasAmenity("smoke-alarm") ? "Smoke alarm" : "No smoke alarm",
              "Some activity may be monitored by the host",
            ]}
          />
          <Rule title="Cancellation policy" lines={["Free cancellation before check-in.", "Review the host's full policy for details."]} />
        </div>
      </section>

      {r.modal === "description" && (
        <Modal open onClose={r.closeModal} title="About this space" size="md">
          <p className="p-6 text-base whitespace-pre-line">{description}</p>
        </Modal>
      )}
      {r.modal === "amenities" && <AmenitiesModal listing={listing} onClose={r.closeModal} />}
      {r.modal === "reviews" && <ReviewsModal listing={listing} focusId={r.review} onClose={r.closeModal} />}
      <PhotoTour listing={listing} onShare={() => setShareOpen(true)} />
      {shareOpen && <ShareModal listing={listing} onClose={() => setShareOpen(false)} />}
    </div>
  );
}

function Rule({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div>
      <h3 className="text-base font-semibold">{title}</h3>
      <ul className="mt-3 space-y-3 text-base">
        {lines.map((t) => (
          <li key={t} className="flex items-center gap-2">
            {t.startsWith("No ") && <Ban size={16} className="shrink-0" />}
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ListingSkeleton() {
  return (
    <div className="mx-auto max-w-[1280px] px-6 md:px-10 xl:px-20" aria-busy="true" aria-label="Loading listing">
      <Skeleton className="mt-6 mb-4 h-8 w-2/3 rounded-8 md:w-1/3" />
      <Skeleton className="aspect-[4/3] w-full rounded-16 md:aspect-[2/1]" />
      <div className="mt-8 grid gap-x-16 md:grid-cols-[minmax(0,1fr)_minmax(320px,33%)]">
        <div className="space-y-4">
          <Skeleton className="h-7 w-1/2 rounded-8" />
          <Skeleton className="h-5 w-1/3 rounded-8" />
          <Skeleton className="mt-8 h-24 w-full rounded-12" />
          <Skeleton className="h-40 w-full rounded-12" />
        </div>
        <Skeleton className="hidden h-[420px] rounded-16 md:block" />
      </div>
    </div>
  );
}
