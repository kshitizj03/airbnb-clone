"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useAuthModal } from "@/components/layout/AuthModal";
import { Button } from "@/components/ui/Button";
import type { Basics, Draft, Location, Pricing, SectionId } from "@/lib/listing-draft";
import { AmenitiesField } from "./fields/AmenitiesField";
import { BasicsField } from "./fields/BasicsField";
import { DescriptionField } from "./fields/DescriptionField";
import { LocationField } from "./fields/LocationField";
import { PhotosField } from "./fields/PhotosField";
import { PlaceTypeField } from "./fields/PlaceTypeField";
import { PriceField } from "./fields/PriceField";
import { PropertyTypeField } from "./fields/PropertyTypeField";
import { TitleField } from "./fields/TitleField";

/** After a listing is created, edited or deleted: host lists, listing pages, search results and the home rows all re-fetch. */
export function useInvalidateListings() {
  const qc = useQueryClient();
  return () => {
    for (const key of ["host", "listing", "search", "search-count", "home-row", "wishlists", "bookings"]) {
      qc.invalidateQueries({ queryKey: [key] });
    }
  };
}

/** Shown instead of host data when nobody is logged in. */
export function LoginPrompt({ title, text }: { title: string; text: string }) {
  const authModal = useAuthModal();
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-24 text-center">
      <h1 className="text-section">{title}</h1>
      <p className="text-secondary">{text}</p>
      <Button variant="primary" className="mt-2" onClick={() => authModal.open(title)}>
        Log in
      </Button>
    </div>
  );
}

/** One field component per editable section, keyed by the section id. The wizard and the editor both render through this. */
export function SectionField({ id, draft, patch, error }: { id: SectionId; draft: Draft; patch: (p: Partial<Draft>) => void; error?: string }) {
  switch (id) {
    case "type":
      return (
        <div className="space-y-8">
          <PropertyTypeField value={draft.property_type} onChange={(property_type) => patch({ property_type })} error={error} />
          <PlaceTypeField value={draft.place_type} onChange={(place_type) => patch({ place_type })} />
        </div>
      );
    case "location":
      return <LocationField value={draft as Location} onChange={patch} error={error} />;
    case "basics":
      return <BasicsField value={draft as Basics} onChange={patch} error={error} />;
    case "amenities":
      return <AmenitiesField value={draft.amenity_slugs} onChange={(amenity_slugs) => patch({ amenity_slugs })} error={error} />;
    case "photos":
      return <PhotosField value={draft.photo_urls} onChange={(photo_urls) => patch({ photo_urls })} error={error} />;
    case "title":
      return <TitleField value={draft.title} onChange={(title) => patch({ title })} error={error} />;
    case "description":
      return <DescriptionField value={draft.description} onChange={(description) => patch({ description })} error={error} />;
    case "pricing":
      return <PriceField value={draft as Pricing} onChange={patch} error={error} />;
  }
}
