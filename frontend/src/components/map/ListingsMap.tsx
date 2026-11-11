"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Star, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, ZoomControl, useMap } from "react-leaflet";
import { HeartButton } from "@/components/listing/HeartButton";
import { PhotoCarousel } from "@/components/listing/PhotoCarousel";
import { cardTitle } from "@/components/listing/ListingCard";
import { formatINR } from "@/lib/format";
import type { ListingCard } from "@/lib/types";

interface Props {
  listings: ListingCard[];
  hoveredId: number | null;
  savedIds: Set<number>;
  /** Where a pin popup links to (so dates and guests carry over). */
  hrefFor?: (id: number) => string;
}

// A price pill. The look lives in globals.css (.price-pin); only numbers go into the string, so no escaping needed.
function pinIcon(l: ListingCard, hot: boolean, saved: boolean) {
  const heart = saved ? `<svg viewBox="0 0 24 24" width="12" height="12" fill="#ff385c"><path d="M12 21s-8-5.4-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.6-8 11-8 11z"/></svg>` : "";
  return L.divIcon({
    className: "",
    iconSize: [0, 0],
    html: `<div class="price-pin${hot ? " price-pin-hot" : ""}">${heart}${formatINR(l.price_per_night)}</div>`,
  });
}

/**
 * Zooms to show every result whenever the results change. Leaflet does not notice its box changing size
 * (the mobile map is hidden until opened), so a resize re-measures and re-fits too.
 */
function FitBounds({ listings }: { listings: ListingCard[] }) {
  const map = useMap();
  useEffect(() => {
    const fit = () => {
      map.invalidateSize();
      if (listings.length === 0 || map.getSize().x === 0) return;
      map.fitBounds(L.latLngBounds(listings.map((l) => [l.latitude, l.longitude])), { padding: [48, 48], maxZoom: 14, animate: false });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [listings, map]);
  return null;
}

export function ListingsMap({ listings, hoveredId, savedIds, hrefFor = (id) => `/rooms/${id}` }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = listings.find((l) => l.id === selectedId);
  // Tiles are only 256px images, so a slightly generous start view is fine; FitBounds sets the real one.
  const center = useMemo<[number, number]>(() => [20.6, 78.9], []);

  return (
    <div className="relative size-full">
      <MapContainer center={center} zoom={5} zoomControl={false} className="size-full" aria-label="Map of search results" scrollWheelZoom>
        <TileLayer
          // CARTO's free Positron tiles now answer "API key required", so plain OpenStreetMap tiles, washed out in CSS (.leaflet-tile-pane).
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
          maxZoom={19}
        />
        <ZoomControl position="topright" />
        <FitBounds listings={listings} />
        {listings.map((l) => (
          <Marker
            key={l.id}
            position={[l.latitude, l.longitude]}
            icon={pinIcon(l, l.id === hoveredId || l.id === selectedId, savedIds.has(l.id))}
            zIndexOffset={l.id === hoveredId || l.id === selectedId ? 1000 : 0}
            eventHandlers={{ click: () => setSelectedId(l.id) }}
          />
        ))}
      </MapContainer>

      {selected && (
        <div className="absolute bottom-6 left-1/2 z-[1000] w-[calc(100%-32px)] max-w-[300px] -translate-x-1/2 overflow-hidden rounded-20 bg-white shadow-secondary">
          <div className="group relative aspect-[4/3] bg-bebe">
            <PhotoCarousel photos={selected.photos} alt={selected.title} href={hrefFor(selected.id)} />
            <HeartButton listing={selected} />
            <button
              type="button"
              aria-label="Close"
              onClick={() => setSelectedId(null)}
              className="absolute top-3 left-3 z-10 flex size-8 items-center justify-center rounded-full bg-white shadow-elevation1 hover:scale-105"
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          </div>
          <Link href={hrefFor(selected.id)} className="block p-3 text-card font-normal">
            <span className="flex items-baseline justify-between gap-2">
              <span className="truncate font-medium">{cardTitle(selected)}</span>
              <span className="flex shrink-0 items-center gap-1">
                <Star size={12} className="fill-current" />
                {selected.review_count === 0 || selected.rating === null ? "New" : `${selected.rating.toFixed(2)} (${selected.review_count})`}
              </span>
            </span>
            <span className="block truncate text-secondary">{selected.title}</span>
            <span className="mt-1 block">
              {selected.total !== null && selected.nights ? (
                <>
                  <span className="font-semibold underline">{formatINR(selected.total)}</span> for {selected.nights} night{selected.nights === 1 ? "" : "s"}
                </>
              ) : (
                <>
                  <span className="font-semibold">{formatINR(selected.price_per_night)}</span> night
                </>
              )}
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}
