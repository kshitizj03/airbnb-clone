"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";
import { Stepper } from "@/components/ui/Stepper";
import { api } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { listingsQuery, NO_FILTERS, type Filters } from "@/lib/listings-query";
import type { SearchParams } from "@/lib/search-params";
import type { Amenity, Page } from "@/lib/types";

export const PRICE_MAX = 25000; // the dearest listing is ₹23,500; the slider's right end means "no maximum"
const SHOWN_FIRST = ["wifi", "kitchen", "air-conditioning", "tv", "free-parking", "pool"];
const GROUPS: [string, string][] = [
  ["popular", "Popular"],
  ["basics", "Essentials"],
  ["features", "Features"],
  ["location", "Location"],
  ["safety", "Safety"],
];
const PLACE_TYPES: [string | undefined, string][] = [
  [undefined, "Any type"],
  ["private_room", "Room"],
  ["entire_home", "Entire home"],
];
export const PROPERTY_TYPES: [string, string][] = [
  ["house", "House"],
  ["flat", "Flat"],
  ["guest_house", "Guest house"],
  ["hotel", "Hotel"],
];

interface Props {
  search: SearchParams;
  onClose: () => void;
  onApply: (f: Filters) => void;
}

const chip = (on: boolean) =>
  `rounded-pill border px-4 py-2.5 text-tab ${on ? "border-hof bg-faint ring-1 ring-hof" : "border-deco hover:border-hof"}`;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-bebe py-8 first:pt-6">
      <h3 className="mb-5 text-row">{title}</h3>
      {children}
    </section>
  );
}

function toggle(list: string[], item: string) {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

/** Rendered only while open (the parent unmounts it), so the draft always starts from the URL's filters. */
export function FiltersModal({ search, onClose, onApply }: Props) {
  const [draft, setDraft] = useState<Filters>({
    minPrice: search.minPrice,
    maxPrice: search.maxPrice,
    placeType: search.placeType,
    propertyTypes: search.propertyTypes,
    amenities: search.amenities,
    bedrooms: search.bedrooms,
    beds: search.beds,
    bathrooms: search.bathrooms,
    instantBook: search.instantBook,
    pets: search.pets,
  });
  const [showAll, setShowAll] = useState(false);
  const set = (patch: Partial<Filters>) => setDraft((d) => ({ ...d, ...patch }));

  // Live count: the same search call as the page, with the draft filters, 300 ms after the last change.
  const [settled, setSettled] = useState(draft);
  useEffect(() => {
    const t = setTimeout(() => setSettled(draft), 300);
    return () => clearTimeout(t);
  }, [draft]);
  const countKey = listingsQuery({ ...search, ...settled }, 1);
  const { data: count } = useQuery({
    queryKey: ["search-count", countKey],
    queryFn: async () => (await api<Page<unknown>>(`/api/listings?${countKey}`)).total,
    placeholderData: keepPreviousData,
  });

  const { data: amenities = [] } = useQuery({
    queryKey: ["amenities"],
    queryFn: () => api<Amenity[]>("/api/amenities"),
    staleTime: Infinity,
  });

  const lo = draft.minPrice ?? 0;
  const hi = draft.maxPrice ?? PRICE_MAX;
  const amenityChip = (a: Amenity) => (
    <button
      key={a.slug}
      type="button"
      aria-pressed={draft.amenities.includes(a.slug)}
      onClick={() => set({ amenities: toggle(draft.amenities, a.slug) })}
      className={chip(draft.amenities.includes(a.slug))}
    >
      {a.name}
    </button>
  );
  const stepper = (label: string, key: "bedrooms" | "beds" | "bathrooms") => (
    <div className="flex items-center justify-between py-3">
      <span className="text-base">{label}</span>
      <Stepper
        label={label.toLowerCase()}
        value={draft[key] ?? 0}
        min={0}
        max={8}
        display={(v) => (v === 0 ? "Any" : `${v}+`)}
        onChange={(v) => set({ [key]: v || undefined })}
      />
    </div>
  );
  const priceInput = (label: string, value: number | undefined, placeholder: string, onValue: (n: number | undefined) => void) => (
    <label className="flex-1 rounded-12 border border-deco px-3 py-2 focus-within:border-hof">
      <span className="block text-label text-secondary">{label}</span>
      <span className="flex items-center gap-1">
        ₹
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(e) => onValue(e.target.value === "" ? undefined : Math.max(0, Math.floor(Number(e.target.value))))}
          onBlur={() => {
            // keep min <= max
            if (draft.minPrice !== undefined && draft.maxPrice !== undefined && draft.minPrice > draft.maxPrice) {
              set({ minPrice: draft.maxPrice, maxPrice: draft.minPrice });
            }
          }}
          className="w-full bg-transparent text-base outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
      </span>
    </label>
  );
  const switchRow = (label: string, on: boolean, onChange: (v: boolean) => void) => (
    <div className="flex items-center justify-between py-3">
      <span className="text-base">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={`relative h-8 w-12 rounded-pill transition-colors ${on ? "bg-hof" : "bg-secondary/60"}`}
      >
        <span className={`absolute top-1 size-6 rounded-full bg-surface transition-all ${on ? "left-5" : "left-1"}`} />
      </button>
    </div>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title="Filters"
      size="lg"
      footer={
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setDraft(NO_FILTERS)} className="rounded-8 px-2 py-2 text-base font-medium underline hover:bg-faint">
            Clear all
          </button>
          <button type="button" onClick={() => onApply(draft)} className="h-12 rounded-8 bg-hof px-6 text-button text-on-hof hover:bg-hof-hover">
            {count === undefined ? "Show places" : `Show ${count} ${count === 1 ? "place" : "places"}`}
          </button>
        </div>
      }
    >
      <div className="px-6 md:px-8">
        <Section title="Type of place">
          <div role="group" aria-label="Type of place" className="flex rounded-12 border border-deco p-1">
            {PLACE_TYPES.map(([value, label]) => (
              <button
                key={label}
                type="button"
                aria-pressed={draft.placeType === value}
                onClick={() => set({ placeType: value })}
                className={`flex-1 rounded-8 py-3 text-base ${draft.placeType === value ? "bg-hof font-medium text-on-hof" : "hover:bg-faint"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Price range">
          <p className="-mt-3 mb-5 text-secondary">Nightly prices before fees and taxes</p>
          <div className="dual-range relative mb-6 h-6">
            <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-bebe" />
            <div
              className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-hof"
              style={{ left: `${(lo / PRICE_MAX) * 100}%`, right: `${100 - (hi / PRICE_MAX) * 100}%` }}
            />
            <input
              type="range"
              aria-label="Minimum price"
              min={0}
              max={PRICE_MAX}
              step={500}
              value={lo}
              onChange={(e) => set({ minPrice: Math.min(Number(e.target.value), hi) || undefined })}
            />
            <input
              type="range"
              aria-label="Maximum price"
              min={0}
              max={PRICE_MAX}
              step={500}
              value={hi}
              onChange={(e) => {
                const v = Math.max(Number(e.target.value), lo);
                set({ maxPrice: v >= PRICE_MAX ? undefined : v });
              }}
            />
          </div>
          <div className="flex items-center gap-4">
            {priceInput("Minimum", draft.minPrice, "0", (n) => set({ minPrice: n || undefined }))}
            <span className="text-secondary">-</span>
            {priceInput("Maximum", draft.maxPrice, `${PRICE_MAX}+`, (n) => set({ maxPrice: n }))}
          </div>
          <p className="mt-2 text-label text-secondary">
            {formatINR(lo)} to {draft.maxPrice === undefined ? `${formatINR(PRICE_MAX)}+` : formatINR(hi)} per night
          </p>
        </Section>

        <Section title="Rooms and beds">
          {stepper("Bedrooms", "bedrooms")}
          {stepper("Beds", "beds")}
          {stepper("Bathrooms", "bathrooms")}
        </Section>

        <Section title="Amenities">
          {showAll ? (
            GROUPS.map(([key, label]) => {
              const items = amenities.filter((a) => a.category === key);
              return (
                items.length > 0 && (
                  <div key={key} className="mb-5 last:mb-0">
                    <h4 className="mb-3 text-base font-semibold">{label}</h4>
                    <div className="flex flex-wrap gap-3">{items.map(amenityChip)}</div>
                  </div>
                )
              );
            })
          ) : (
            <div className="flex flex-wrap gap-3">
              {SHOWN_FIRST.map((slug) => amenities.find((a) => a.slug === slug))
                .filter((a): a is Amenity => !!a)
                .map(amenityChip)}
            </div>
          )}
          <button type="button" onClick={() => setShowAll(!showAll)} className="mt-5 text-base font-medium underline">
            {showAll ? "Show less" : "Show more"}
          </button>
        </Section>

        <Section title="Booking options">
          {switchRow("Instant Book", !!draft.instantBook, (v) => set({ instantBook: v || undefined }))}
          {switchRow("Allows pets", draft.pets > 0, (v) => set({ pets: v ? 1 : 0 }))}
        </Section>

        <section className="py-8">
          <h3 className="mb-5 text-row">Property type</h3>
          <div className="flex flex-wrap gap-3">
            {PROPERTY_TYPES.map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={draft.propertyTypes.includes(value)}
                onClick={() => set({ propertyTypes: toggle(draft.propertyTypes, value) })}
                className={chip(draft.propertyTypes.includes(value))}
              >
                {label}
              </button>
            ))}
          </div>
        </section>
      </div>
    </Modal>
  );
}
