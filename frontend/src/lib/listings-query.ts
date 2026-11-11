// Turns the URL's SearchParams into the backend's GET /api/listings query, and holds the filter helpers.
import type { SearchParams } from "./search-params";

/** The part of a search the Filters modal edits. `pets` is the guest count in the URL; > 0 means "allows pets". */
export type Filters = Pick<
  SearchParams,
  "minPrice" | "maxPrice" | "placeType" | "propertyTypes" | "amenities" | "bedrooms" | "beds" | "bathrooms" | "instantBook" | "pets"
>;

export const NO_FILTERS: Filters = {
  minPrice: undefined,
  maxPrice: undefined,
  placeType: undefined,
  propertyTypes: [],
  amenities: [],
  bedrooms: undefined,
  beds: undefined,
  bathrooms: undefined,
  instantBook: undefined,
  pets: 0,
};

/** How many filters are on (each amenity and property type counts; min and max price count once). */
export function filterCount(f: Filters): number {
  return (
    [f.placeType, f.bedrooms, f.beds, f.bathrooms, f.instantBook, f.pets > 0, f.minPrice !== undefined || f.maxPrice !== undefined].filter(Boolean)
      .length +
    f.propertyTypes.length +
    f.amenities.length
  );
}

/** Backend query string. Dates go out only as a valid pair (check_out after check_in). */
export function listingsQuery(s: SearchParams, page = 1): string {
  const q = new URLSearchParams();
  const set = (k: string, v: string | number | undefined) => {
    if (v !== undefined && v !== "" && v !== 0) q.set(k, String(v));
  };
  set("location", s.location?.trim());
  if (s.checkIn && s.checkOut && s.checkOut > s.checkIn) {
    q.set("check_in", s.checkIn);
    q.set("check_out", s.checkOut);
  }
  set("guests", s.adults + s.children);
  set("min_price", s.minPrice);
  set("max_price", s.maxPrice);
  set("place_type", s.placeType);
  set("property_types", s.propertyTypes.join(","));
  set("amenities", s.amenities.join(","));
  set("bedrooms", s.bedrooms);
  set("beds", s.beds);
  set("bathrooms", s.bathrooms);
  if (s.instantBook) q.set("instant_book", "true");
  if (s.pets > 0) q.set("pets", "true");
  q.set("page", String(page));
  return q.toString();
}
