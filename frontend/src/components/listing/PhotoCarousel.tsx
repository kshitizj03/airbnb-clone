"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

/** Swipeable photo strip (CSS scroll-snap) with dots and hover arrows. The caller sizes it and rounds it. */
export function PhotoCarousel({ photos, alt, href }: { photos: string[]; alt: string; href: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  function go(dir: -1 | 1) {
    const el = track.current!;
    el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  }

  const arrow =
    "absolute top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-elevated/90 opacity-0 shadow-elevation1 transition hover:scale-105 hover:bg-elevated group-focus-within:opacity-100 group-hover:opacity-100 disabled:hidden! [@media(hover:none)]:pointer-events-none";

  return (
    <div className="relative size-full overflow-hidden">
      <div
        ref={track}
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="flex size-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((src, i) => (
          // The photo itself is the link, so the strip stays swipeable and a tap still opens the listing.
          <Link key={src} href={href} tabIndex={-1} draggable={false} className="size-full shrink-0 snap-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={i === 0 ? alt : ""} loading={i === 0 ? "eager" : "lazy"} draggable={false} className="size-full object-cover" />
          </Link>
        ))}
      </div>
      {photos.length > 1 && (
        <>
          <button type="button" aria-label="Previous photo" disabled={index === 0} onClick={() => go(-1)} className={`${arrow} left-2`}>
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            disabled={index === photos.length - 1}
            onClick={() => go(1)}
            className={`${arrow} right-2`}
          >
            <ChevronRight size={16} />
          </button>
          <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1">
            {photos.map((_, i) => (
              <span key={i} className={`size-1.5 rounded-full ${i === index ? "bg-white" : "bg-white/60"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
