"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";

/** Swipeable photo strip (CSS scroll-snap) with dots and hover arrows. The caller sizes it and rounds it. */
export function PhotoCarousel({ photos, alt }: { photos: string[]; alt: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  function go(dir: -1 | 1) {
    const el = track.current!;
    el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  }

  const arrow =
    "absolute top-1/2 z-10 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-elevation1 transition hover:scale-105 hover:bg-white group-hover:flex disabled:hidden";

  return (
    <div className="relative size-full overflow-hidden">
      <div
        ref={track}
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="flex size-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            alt={i === 0 ? alt : ""}
            loading={i === 0 ? "eager" : "lazy"}
            className="size-full shrink-0 snap-center object-cover"
          />
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
