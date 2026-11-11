"use client";

import { ChevronLeft, ChevronRight, Heart, Share, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import { useRoomParams } from "@/hooks/useRoomParams";
import { useWishlists } from "@/hooks/useWishlists";
import type { ListingDetail } from "@/lib/types";

/**
 * ?modal=photos is the scrollable photo tour; ?modal=photos&photo=3 is the full-screen viewer.
 * The viewer replaces the tour while it is open, and closing it goes back to the tour.
 */
export function PhotoTour({ listing, onShare }: { listing: ListingDetail; onShare: () => void }) {
  const { modal, photo, set, openModal, closeModal } = useRoomParams();
  if (modal !== "photos") return null;
  const n = listing.photos.length;

  if (photo !== null && photo < n) {
    return <PhotoViewer listing={listing} index={photo} onShare={onShare} onIndex={(i) => set({ photo: i })} onClose={() => set({ photo: undefined })} />;
  }

  return (
    <Modal open onClose={closeModal} title="Photo tour" size="full">
      <div className="mx-auto grid max-w-[900px] grid-cols-2 gap-2 p-4 md:p-6">
        {listing.photos.map((src, i) => (
          // Every third photo spans the row, so the grid looks like Airbnb's mixed layout.
          <button key={src} type="button" aria-label={`Open photo ${i + 1} of ${n}`} onClick={() => openModal("photos", { photo: i })} className={`overflow-hidden rounded-8 bg-bebe ${i % 3 === 0 ? "col-span-2 aspect-[3/2]" : "aspect-square"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" loading={i < 4 ? "eager" : "lazy"} className="size-full object-cover hover:brightness-90" />
          </button>
        ))}
      </div>
    </Modal>
  );
}

function PhotoViewer({ listing, index, onShare, onIndex, onClose }: { listing: ListingDetail; index: number; onShare: () => void; onIndex: (i: number) => void; onClose: () => void }) {
  const n = listing.photos.length;
  const { savedMap, toggle } = useWishlists();
  const saved = savedMap[listing.id] !== undefined;
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchX = useRef(0);
  const prev = () => index > 0 && onIndex(index - 1);
  const next = () => index < n - 1 && onIndex(index + 1);

  // Keys always call the latest handlers (they close over `index`).
  const keys = useRef({ prev, next, onClose });
  useEffect(() => {
    keys.current = { prev, next, onClose };
  });
  useEffect(() => {
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") keys.current.onClose();
      else if (e.key === "ArrowLeft") keys.current.prev();
      else if (e.key === "ArrowRight") keys.current.next();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const arrow = "flex size-10 items-center justify-center rounded-full border border-white/60 text-white hover:bg-white/10 disabled:invisible";
  const top = "flex items-center gap-2 rounded-8 px-3 py-2 text-sm font-medium text-white hover:bg-white/10";
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      className="fixed inset-0 z-[60] flex flex-col bg-black"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (dx > 50) prev();
        else if (dx < -50) next();
      }}
    >
      <div className="flex h-16 shrink-0 items-center justify-between px-4">
        <button ref={closeRef} type="button" onClick={onClose} className={top}>
          <X size={16} /> Close
        </button>
        <span className="text-sm text-white">
          {index + 1} / {n}
        </span>
        <div className="flex">
          <button type="button" onClick={onShare} className={top}>
            <Share size={16} /> <span className="max-md:sr-only">Share</span>
          </button>
          <button type="button" aria-pressed={saved} onClick={() => toggle(listing)} className={top}>
            <Heart size={16} className={saved ? "fill-rausch stroke-rausch" : ""} /> <span className="max-md:sr-only">{saved ? "Saved" : "Save"}</span>
          </button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-between gap-4 px-4 pb-8 md:px-10">
        <button type="button" aria-label="Previous photo" disabled={index === 0} onClick={prev} className={`${arrow} max-md:hidden`}>
          <ChevronLeft size={20} />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={listing.photos[index]} alt={`Photo ${index + 1} of ${n}`} className="mx-auto max-h-full min-w-0 max-w-full object-contain" />
        <button type="button" aria-label="Next photo" disabled={index === n - 1} onClick={next} className={`${arrow} max-md:hidden`}>
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
