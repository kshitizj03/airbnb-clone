"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Armchair, Baby, Bath, Bell, Briefcase, Car, Coffee, CookingPot, Dumbbell, Droplets, Flame, Fan, Refrigerator, Search, ShieldAlert, Shirt, Snowflake,
  Sparkles, Tv, Umbrella, Utensils, Waves, WashingMachine, Wifi, Wind, Zap, type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api";
import type { Amenity, ListingDetail } from "@/lib/types";

const ICONS: Record<string, LucideIcon> = {
  "air-conditioning": Snowflake, essentials: Bath, fridge: Refrigerator, heating: Flame, "hot-water": Droplets, kitchen: Utensils, tv: Tv,
  "tumble-dryer": Wind, "washing-machine": WashingMachine, wifi: Wifi, "coffee-maker": Coffee, "cooking-basics": CookingPot, hairdryer: Fan,
  hangers: Shirt, iron: Shirt, shampoo: Droplets, cot: Baby, "dedicated-workspace": Briefcase, "ev-charger": Zap, "free-parking": Car, gym: Dumbbell,
  "hot-tub": Waves, "indoor-fireplace": Flame, "outdoor-furniture": Armchair, pool: Waves, "beach-access": Umbrella, waterfront: Waves,
  "carbon-monoxide-alarm": ShieldAlert, "smoke-alarm": Bell,
};
const iconFor = (slug: string): LucideIcon => ICONS[slug] ?? Sparkles;

const CATEGORY_LABEL: Record<string, string> = { basics: "Basics", popular: "Popular", features: "Features", location: "Location", safety: "Safety" };
const CATEGORY_ORDER = ["basics", "popular", "features", "location", "safety"];

export function AmenitiesSection({ listing, onShowAll }: { listing: ListingDetail; onShowAll: () => void }) {
  const shown = listing.amenities.slice(0, 10);
  return (
    <section id="amenities" className="scroll-mt-40 border-b border-bebe py-8">
      <h2 className="text-section">What this place offers</h2>
      <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {shown.map((a) => {
          const Icon = iconFor(a.slug);
          return (
            <li key={a.slug} className="flex items-center gap-4 text-base">
              <Icon size={24} strokeWidth={1.5} /> {a.name}
            </li>
          );
        })}
      </ul>
      <button type="button" onClick={onShowAll} className="mt-8 h-12 rounded-8 border border-hof px-6 text-base font-medium hover:bg-faint max-md:w-full">
        Show all {listing.amenities.length} amenities
      </button>
    </section>
  );
}

export function AmenitiesModal({ listing, onClose }: { listing: ListingDetail; onClose: () => void }) {
  const [search, setSearch] = useState("");
  // Everything the site knows about, so we can list what this place does NOT have.
  const { data: all = [] } = useQuery({ queryKey: ["amenities"], queryFn: () => api<Amenity[]>("/api/amenities"), staleTime: Infinity });
  const has = new Set(listing.amenities.map((a) => a.slug));
  const matches = (a: Amenity) => a.name.toLowerCase().includes(search.trim().toLowerCase());
  const missing = all.filter((a) => !has.has(a.slug) && matches(a));

  const groups = CATEGORY_ORDER.map((c) => ({ c, items: listing.amenities.filter((a) => a.category === c && matches(a)) })).filter((g) => g.items.length);

  return (
    <Modal open onClose={onClose} title="What this place offers" size="md">
      <div className="p-6">
        <label className="flex h-12 items-center gap-3 rounded-pill border border-deco px-4 focus-within:border-hof">
          <Search size={16} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search amenities" aria-label="Search amenities" className="w-full outline-none" />
        </label>
        {groups.map(({ c, items }) => (
          <div key={c} className="border-b border-bebe py-6">
            <h3 className="mb-4 text-base font-semibold">{CATEGORY_LABEL[c] ?? c}</h3>
            <ul className="space-y-4">
              {items.map((a) => {
                const Icon = iconFor(a.slug);
                return (
                  <li key={a.slug} className="flex items-center gap-4 text-base">
                    <Icon size={24} strokeWidth={1.5} /> {a.name}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {missing.length > 0 && (
          <div className="py-6">
            <h3 className="mb-4 text-base font-semibold">Not included</h3>
            <ul className="space-y-4 text-secondary">
              {missing.map((a) => {
                const Icon = iconFor(a.slug);
                return (
                  <li key={a.slug} className="flex items-center gap-4 text-base line-through">
                    <Icon size={24} strokeWidth={1.5} /> {a.name}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {groups.length === 0 && missing.length === 0 && <p className="py-8 text-secondary">No amenities match &quot;{search}&quot;.</p>}
      </div>
    </Modal>
  );
}

