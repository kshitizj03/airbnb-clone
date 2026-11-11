"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { filterCount, type Filters } from "@/lib/listings-query";
import { formatINR } from "@/lib/format";
import { PROPERTY_TYPES } from "./FiltersModal";

interface Props {
  filters: Filters;
  amenityNames: Record<string, string>; // slug -> "Free parking on premises"
  onChange: (patch: Partial<Filters>) => void;
  onOpenFilters: () => void;
}

// Quick chips in the spec's order. Each one is a real backend filter.
type Quick = { label: string; on: (f: Filters) => boolean; patch: (f: Filters) => Partial<Filters> };
const amenityChip = (label: string, slug: string): Quick => ({
  label,
  on: (f) => f.amenities.includes(slug),
  patch: (f) => ({ amenities: f.amenities.includes(slug) ? f.amenities.filter((a) => a !== slug) : [...f.amenities, slug] }),
});
const QUICK: Quick[] = [
  { label: "Allows pets", on: (f) => f.pets > 0, patch: (f) => ({ pets: f.pets > 0 ? 0 : 1 }) },
  amenityChip("Free parking", "free-parking"),
  amenityChip("Kitchen", "kitchen"),
  { label: "1+ bathrooms", on: (f) => f.bathrooms === 1, patch: (f) => ({ bathrooms: f.bathrooms === 1 ? undefined : 1 }) },
  amenityChip("Air conditioning", "air-conditioning"),
  { label: "1+ beds", on: (f) => f.beds === 1, patch: (f) => ({ beds: f.beds === 1 ? undefined : 1 }) },
  amenityChip("TV", "tv"),
  amenityChip("Hot tub", "hot-tub"),
  amenityChip("Wifi", "wifi"),
];
const QUICK_AMENITIES = new Set(["free-parking", "kitchen", "air-conditioning", "tv", "hot-tub", "wifi"]);

const base = "flex h-[34px] shrink-0 items-center gap-2 rounded-24 border bg-white px-4 text-label whitespace-nowrap hover:border-hof";

/** The filter row above the results: Filters button, the applied filters, then quick toggles. */
export function FilterChips({ filters: f, amenityNames, onChange, onOpenFilters }: Props) {
  const count = filterCount(f);

  // Applied filters the quick chips cannot show (a quick chip shows itself as pressed).
  const applied: { label: string; clear: Partial<Filters> }[] = [];
  if (f.placeType) applied.push({ label: f.placeType === "entire_home" ? "Entire home" : "Room", clear: { placeType: undefined } });
  if (f.minPrice !== undefined || f.maxPrice !== undefined) {
    const label =
      f.minPrice !== undefined && f.maxPrice !== undefined
        ? `${formatINR(f.minPrice)} - ${formatINR(f.maxPrice)} per night`
        : f.maxPrice !== undefined
          ? `Up to ${formatINR(f.maxPrice)} per night`
          : `${formatINR(f.minPrice!)}+ per night`;
    applied.push({ label, clear: { minPrice: undefined, maxPrice: undefined } });
  }
  if (f.bedrooms) applied.push({ label: `${f.bedrooms}+ bedrooms`, clear: { bedrooms: undefined } });
  if (f.beds && f.beds > 1) applied.push({ label: `${f.beds}+ beds`, clear: { beds: undefined } });
  if (f.bathrooms && f.bathrooms > 1) applied.push({ label: `${f.bathrooms}+ bathrooms`, clear: { bathrooms: undefined } });
  if (f.instantBook) applied.push({ label: "Instant Book", clear: { instantBook: undefined } });
  for (const t of f.propertyTypes) {
    applied.push({ label: PROPERTY_TYPES.find(([v]) => v === t)?.[1] ?? t, clear: { propertyTypes: f.propertyTypes.filter((x) => x !== t) } });
  }
  for (const slug of f.amenities.filter((a) => !QUICK_AMENITIES.has(a))) {
    applied.push({ label: amenityNames[slug] ?? slug, clear: { amenities: f.amenities.filter((a) => a !== slug) } });
  }

  return (
    <div role="group" aria-label="Filters" className="flex gap-2 overflow-x-auto py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <button type="button" onClick={onOpenFilters} className={`${base} font-medium ${count ? "border-hof" : "border-deco"}`}>
        <SlidersHorizontal size={14} />
        Filters
        {count > 0 && (
          <span aria-label={`${count} active`} className="flex size-5 items-center justify-center rounded-full bg-hof text-[11px] text-white">
            {count}
          </span>
        )}
      </button>
      {applied.map((a) => (
        <button key={a.label} type="button" aria-label={`Remove filter ${a.label}`} onClick={() => onChange(a.clear)} className={`${base} border-hof bg-faint`}>
          {a.label}
          <X size={12} />
        </button>
      ))}
      {QUICK.map((q) => {
        const on = q.on(f);
        return (
          <button key={q.label} type="button" aria-pressed={on} onClick={() => onChange(q.patch(f))} className={`${base} ${on ? "border-hof bg-faint ring-1 ring-hof" : "border-deco"}`}>
            {q.label}
          </button>
        );
      })}
    </div>
  );
}
