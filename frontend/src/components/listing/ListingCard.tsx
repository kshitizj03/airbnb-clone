import Link from "next/link";
import { Star } from "lucide-react";
import { formatINR } from "@/lib/format";
import type { ListingCard as Listing } from "@/lib/types";
import { HeartButton } from "./HeartButton";
import { PhotoCarousel } from "./PhotoCarousel";

const TYPE_LABEL: Record<string, string> = {
  house: "Home",
  flat: "Flat",
  guest_house: "Guest house",
  hotel: "Room in hotel",
};

/** "Flat in Calangute"; rooms read "Room in Goa". */
export function cardTitle(l: Listing): string {
  if (l.place_type === "private_room" || l.place_type === "shared_room") return `Room in ${l.city}`;
  return `${TYPE_LABEL[l.property_type] ?? "Home"} in ${l.city}`;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

interface Props {
  listing: Listing;
  variant: "row" | "grid";
  onHover?: (id: number | null) => void;
  href?: string; // where the card goes; defaults to the listing page
}

export function ListingCard({ listing: l, variant, onHover, href = `/rooms/${l.id}` }: Props) {
  const favourite = l.rating !== null && l.rating >= 4.9 && l.review_count >= 5;
  const badge = favourite && (
    <span className="pointer-events-none absolute top-3 left-3 z-10 rounded-pill bg-white px-2.5 py-1 text-label font-medium shadow-elevation1">
      Guest favourite
    </span>
  );
  // The title link is stretched over the whole card (after:inset-0); the heart and arrows sit above it (z-10).
  const link = "after:absolute after:inset-0 after:content-['']";

  if (variant === "row") {
    return (
      <div className="group relative w-[180px] shrink-0 snap-start" onMouseEnter={() => onHover?.(l.id)} onMouseLeave={() => onHover?.(null)}>
        <div className="relative aspect-[180/171] overflow-hidden rounded-20 bg-bebe">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={l.photos[0]} alt="" loading="lazy" className="size-full object-cover" />
          {badge}
          <HeartButton listing={l} />
        </div>
        <Link href={href} className={`mt-2 block text-card-home ${link}`}>
          {cardTitle(l)}
        </Link>
        <p className="text-label font-normal text-secondary">
          {l.total !== null && l.nights ? `${formatINR(l.total)} for ${plural(l.nights, "night")}` : `${formatINR(l.price_per_night)} night`}
          {l.rating !== null && (
            <>
              {" · "}
              <Star size={10} className="-mt-0.5 inline fill-current" /> {l.rating.toFixed(2)}
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="group relative" onMouseEnter={() => onHover?.(l.id)} onMouseLeave={() => onHover?.(null)}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-20 bg-bebe">
        <PhotoCarousel photos={l.photos} alt={l.title} href={href} />
        {badge}
        <HeartButton listing={l} />
      </div>
      <div className="relative mt-3">
      <div className="flex items-baseline justify-between gap-2 text-card">
        <Link href={href} className={`truncate ${link}`}>
          {cardTitle(l)}
        </Link>
        <span className="flex shrink-0 items-center gap-1 text-card font-normal">
          <Star size={12} className="fill-current" />
          {l.review_count === 0 || l.rating === null ? "New" : `${l.rating.toFixed(2)} (${l.review_count})`}
        </span>
      </div>
      <p className="truncate text-card font-normal text-secondary">{l.title}</p>
      <p className="text-card font-normal text-secondary">
        {plural(l.bedrooms, "bedroom")} · {plural(l.beds, "bed")} · {plural(l.bathrooms, "bathroom")}
      </p>
      <p className="mt-1 text-card font-normal">
        {l.total !== null && l.nights ? (
          <>
            <span className="font-semibold underline">{formatINR(l.total)}</span> for {plural(l.nights, "night")}
          </>
        ) : (
          <>
            <span className="font-semibold">{formatINR(l.price_per_night)}</span> night
          </>
        )}
      </p>
      </div>
    </div>
  );
}
