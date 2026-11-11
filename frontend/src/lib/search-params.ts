// One place that knows how a search is written in the URL: /s/<Location>/homes?check_in=...
// Param names are the backend's. Dates stay "YYYY-MM-DD" strings (parse with parseISO, never new Date(string)).
import { isValid, parseISO } from "date-fns";

export interface SearchParams {
  location?: string;
  checkIn?: string;
  checkOut?: string;
  adults: number;
  children: number;
  infants: number;
  pets: number;
  // Filters (UI arrives in the search page task)
  minPrice?: number;
  maxPrice?: number;
  placeType?: string;
  propertyTypes: string[];
  amenities: string[];
  bedrooms?: number;
  beds?: number;
  bathrooms?: number;
  instantBook?: boolean;
  page?: number;
}

export interface Guests {
  adults: number;
  children: number;
  infants: number;
  pets: number;
}

const int = (v: string | null): number | undefined => {
  const n = Number(v);
  return v !== null && v !== "" && Number.isInteger(n) && n >= 0 ? n : undefined;
};
const isoDate = (v: string | null): string | undefined =>
  v && /^\d{4}-\d{2}-\d{2}$/.test(v) && isValid(parseISO(v)) ? v : undefined;
const list = (v: string | null): string[] => (v ? v.split(",").filter(Boolean) : []);

/** The location is not a query param (it lives in the path): callers add it with locationFromSlug. */
export function parseSearchParams(sp: URLSearchParams): SearchParams {
  return {
    checkIn: isoDate(sp.get("check_in")),
    checkOut: isoDate(sp.get("check_out")),
    adults: int(sp.get("adults")) ?? 0,
    children: int(sp.get("children")) ?? 0,
    infants: int(sp.get("infants")) ?? 0,
    pets: int(sp.get("pets")) ?? 0,
    minPrice: int(sp.get("min_price")),
    maxPrice: int(sp.get("max_price")),
    placeType: sp.get("place_type") || undefined,
    propertyTypes: list(sp.get("property_types")),
    amenities: list(sp.get("amenities")),
    bedrooms: int(sp.get("bedrooms")),
    beds: int(sp.get("beds")),
    bathrooms: int(sp.get("bathrooms")),
    instantBook: sp.get("instant_book") === "true" ? true : undefined,
    page: int(sp.get("page")),
  };
}

/** Query string without the leading "?". Empty values are left out. */
export function toQuery(p: SearchParams): string {
  const q = new URLSearchParams();
  const set = (key: string, v: string | number | undefined) => {
    if (v !== undefined && v !== "" && v !== 0) q.set(key, String(v));
  };
  // The backend wants both dates or neither.
  if (p.checkIn && p.checkOut) {
    set("check_in", p.checkIn);
    set("check_out", p.checkOut);
  }
  set("adults", p.adults);
  set("children", p.children);
  set("infants", p.infants);
  set("pets", p.pets);
  set("min_price", p.minPrice);
  set("max_price", p.maxPrice);
  set("place_type", p.placeType);
  set("property_types", p.propertyTypes.join(","));
  set("amenities", p.amenities.join(","));
  set("bedrooms", p.bedrooms);
  set("beds", p.beds);
  set("bathrooms", p.bathrooms);
  if (p.instantBook) q.set("instant_book", "true");
  if (p.page && p.page > 1) q.set("page", String(p.page));
  return q.toString();
}

// "North Goa" <-> "North-Goa". ponytail: a city that really contains a hyphen comes back with a space.
export const locationToSlug = (location: string): string =>
  encodeURIComponent(location.trim().replace(/\s+/g, "-"));

export function locationFromSlug(slug: string): string {
  let s = slug;
  try {
    s = decodeURIComponent(slug);
  } catch {
    // already decoded (Next may hand us a decoded param)
  }
  return s.replace(/-/g, " ");
}

/** No location means "anywhere": /s/homes (the search page must serve this path too). */
export function searchHref(p: SearchParams): string {
  const path = p.location?.trim() ? `/s/${locationToSlug(p.location)}/homes` : "/s/homes";
  const q = toQuery(p);
  return q ? `${path}?${q}` : path;
}

/** "2 guests, 1 infant, 1 pet". Empty string when nobody is added. */
export function guestSummary(g: Guests): string {
  const guests = g.adults + g.children;
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  return [
    guests > 0 && plural(guests, "guest"),
    g.infants > 0 && plural(g.infants, "infant"),
    g.pets > 0 && plural(g.pets, "pet"),
  ]
    .filter(Boolean)
    .join(", ");
}
