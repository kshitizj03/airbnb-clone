"use client";

import { ArrowLeft, Grip, Heart, Share } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useRoomParams } from "@/hooks/useRoomParams";
import { useWishlists } from "@/hooks/useWishlists";
import type { ListingDetail } from "@/lib/types";

/** 1 big photo + 4 small on desktop. On phones a swipeable strip with "1 / N" and round buttons over it. */
export function PhotoMosaic({ listing, onShare }: { listing: ListingDetail; onShare: () => void }) {
  const { openModal } = useRoomParams();
  const router = useRouter();
  const { savedMap, toggle } = useWishlists();
  const [index, setIndex] = useState(0);
  const photos = listing.photos;
  const saved = savedMap[listing.id] !== undefined;
  const round = "flex size-8 items-center justify-center rounded-full bg-elevated shadow-elevation1";

  return (
    <>
      {/* Desktop */}
      <div className="relative hidden aspect-[2.3/1] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-16 md:grid">
        {photos.slice(0, photos.length >= 5 ? 5 : 1).map((src, i) => (
          <button
            key={src}
            type="button"
            aria-label={`Open photo ${i + 1} of ${photos.length}`}
            onClick={() => openModal("photos", { photo: i })}
            className={`overflow-hidden bg-bebe ${photos.length >= 5 ? (i === 0 ? "col-span-2 row-span-2" : "") : "col-span-4 row-span-2"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={i === 0 ? listing.title : ""} className="size-full object-cover transition hover:brightness-90" />
          </button>
        ))}
        <button
          type="button"
          onClick={() => openModal("photos")}
          className="absolute right-6 bottom-6 flex items-center gap-2 rounded-8 border border-hof bg-elevated px-3 py-1.5 text-sm font-medium hover:bg-faint"
        >
          <Grip size={16} /> Show all photos
        </button>
      </div>

      {/* Phone */}
      <div className="relative -mx-6 md:hidden">
        <div
          onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          className="flex aspect-[4/3] snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {photos.map((src, i) => (
            <button key={src} type="button" aria-label={`Open photo ${i + 1} of ${photos.length}`} onClick={() => openModal("photos", { photo: i })} className="size-full shrink-0 snap-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={i === 0 ? listing.title : ""} className="size-full object-cover" />
            </button>
          ))}
        </div>
        <div className="pointer-events-none absolute right-4 bottom-4 rounded-8 bg-[#222222]/80 px-2 py-1 text-xs font-medium text-white">
          {index + 1} / {photos.length}
        </div>
        <button type="button" aria-label="Back" onClick={() => router.back()} className={`${round} absolute top-4 left-4`}>
          <ArrowLeft size={16} />
        </button>
        <div className="absolute top-4 right-4 flex gap-3">
          <button type="button" aria-label="Share" onClick={onShare} className={round}>
            <Share size={16} />
          </button>
          <button type="button" aria-label={saved ? "Remove from wishlist" : "Save"} aria-pressed={saved} onClick={() => toggle(listing)} className={round}>
            <Heart size={16} className={saved ? "fill-rausch stroke-rausch" : ""} />
          </button>
        </div>
      </div>
    </>
  );
}
