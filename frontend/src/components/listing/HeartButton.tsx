"use client";

import { Heart } from "lucide-react";
import { useWishlists } from "@/hooks/useWishlists";
import type { ListingCard } from "@/lib/types";

export function HeartButton({ listing }: { listing: ListingCard }) {
  const { savedMap, toggle } = useWishlists();
  const saved = savedMap[listing.id] !== undefined;
  return (
    <button
      type="button"
      aria-label={saved ? "Remove from wishlist" : "Save"}
      aria-pressed={saved}
      onClick={() => toggle(listing)}
      className="absolute top-3 right-3 z-10 transition-transform hover:scale-110 active:scale-95"
    >
      <Heart
        size={24}
        strokeWidth={2}
        className={saved ? "fill-rausch stroke-white" : "fill-black/50 stroke-white"}
      />
    </button>
  );
}
