// The shape of a listing while a host is filling it in (wizard) or editing it (editor).
// Both use the same field components, so the draft, the sections and their rules live here once.
import type { ListingDetail } from "./types";

export interface Draft {
  property_type: string;
  place_type: string;
  address: string;
  city: string;
  state: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  max_guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  amenity_slugs: string[];
  photo_urls: string[];
  title: string;
  description: string;
  price_per_night: number;
  cleaning_fee: number;
  instant_book: boolean;
  pets_allowed: boolean;
}

export const EMPTY_DRAFT: Draft = {
  property_type: "",
  place_type: "",
  address: "",
  city: "",
  state: "",
  country: "India",
  latitude: null,
  longitude: null,
  max_guests: 2,
  bedrooms: 1,
  beds: 1,
  bathrooms: 1,
  amenity_slugs: [],
  photo_urls: [],
  title: "",
  description: "",
  price_per_night: 0,
  cleaning_fee: 0,
  instant_book: false,
  pets_allowed: false,
};

export type Location = Pick<Draft, "address" | "city" | "state" | "country" | "latitude" | "longitude">;
export type Basics = Pick<Draft, "max_guests" | "bedrooms" | "beds" | "bathrooms">;
export type Pricing = Pick<Draft, "price_per_night" | "cleaning_fee" | "instant_book" | "pets_allowed">;

export const MAX_PRICE = 1_000_000;
export const isPhotoUrl = (u: string) => /^https?:\/\/\S+$/i.test(u) || /^\/uploads\/\S+$/.test(u);

export type SectionId = "type" | "location" | "basics" | "amenities" | "photos" | "title" | "description" | "pricing";

/** Which draft keys each section owns: the editor PATCHes exactly these, and API field errors map back through them. */
export const SECTION_KEYS: Record<SectionId, (keyof Draft)[]> = {
  type: ["property_type", "place_type"],
  location: ["address", "city", "state", "country", "latitude", "longitude"],
  basics: ["max_guests", "bedrooms", "beds", "bathrooms"],
  amenities: ["amenity_slugs"],
  photos: ["photo_urls"],
  title: ["title"],
  description: ["description"],
  pricing: ["price_per_night", "cleaning_fee", "instant_book", "pets_allowed"],
};

const inRange = (n: number, lo: number, hi: number) => Number.isInteger(n) && n >= lo && n <= hi;

export function sectionOk(id: SectionId, d: Draft): boolean {
  switch (id) {
    case "type":
      return !!d.property_type && !!d.place_type;
    case "location":
      return !!(d.address.trim() && d.city.trim() && d.state.trim() && d.country.trim()) && d.latitude !== null && d.longitude !== null;
    case "basics":
      return inRange(d.max_guests, 1, 16) && inRange(d.bedrooms, 0, 50) && inRange(d.beds, 1, 50) && inRange(d.bathrooms, 1, 50);
    case "amenities":
      return true;
    case "photos":
      return d.photo_urls.length >= 1 && d.photo_urls.length <= 20;
    case "title":
      return d.title.trim().length >= 1 && d.title.length <= 50;
    case "description":
      return d.description.trim().length >= 1 && d.description.length <= 500;
    case "pricing":
      return d.price_per_night > 0 && d.price_per_night <= MAX_PRICE && d.cleaning_fee >= 0;
  }
}

/** The first API field error (from a 422) that belongs to this section, if any. */
export function sectionError(id: SectionId, fields?: Record<string, string>): string | undefined {
  if (!fields) return undefined;
  const key = Object.keys(fields).find((f) => SECTION_KEYS[id].some((k) => f === k || f.startsWith(`${k}[`) || f.startsWith(`${k}.`)));
  return key ? fields[key] : undefined;
}

/** The section's values as sent to the API (and compared for dirtiness): text is trimmed, like the wizard does. */
export function pick(d: Draft, id: SectionId): Partial<Draft> {
  return Object.fromEntries(SECTION_KEYS[id].map((k) => [k, typeof d[k] === "string" ? (d[k] as string).trim() : d[k]]));
}

export const sectionDirty = (id: SectionId, draft: Draft, saved: Draft) => JSON.stringify(pick(draft, id)) !== JSON.stringify(pick(saved, id));

export function toDraft(l: ListingDetail): Draft {
  return {
    property_type: l.property_type,
    place_type: l.place_type,
    address: l.address,
    city: l.city,
    state: l.state,
    country: l.country,
    latitude: l.latitude,
    longitude: l.longitude,
    max_guests: l.max_guests,
    bedrooms: l.bedrooms,
    beds: l.beds,
    bathrooms: l.bathrooms,
    amenity_slugs: l.amenities.map((a) => a.slug),
    photo_urls: l.photos,
    title: l.title,
    description: l.description,
    price_per_night: l.price_per_night,
    cleaning_fee: l.cleaning_fee,
    instant_book: l.instant_book,
    pets_allowed: l.pets_allowed,
  };
}

// Centres of the seeded cities, so the location map starts where the host is typing.
const CITY_CENTRES: Record<string, [number, number]> = {
  goa: [15.4909, 73.8278],
  jaipur: [26.9124, 75.7873],
  udaipur: [24.5854, 73.7125],
  manali: [32.2396, 77.1887],
  rishikesh: [30.0869, 78.2676],
  mumbai: [19.076, 72.8777],
  bengaluru: [12.9716, 77.5946],
  kochi: [9.9312, 76.2673],
  pondicherry: [11.9416, 79.8083],
  coorg: [12.3375, 75.8069],
  shimla: [31.1048, 77.1734],
  dubai: [25.2048, 55.2708],
  bali: [-8.4095, 115.1889],
};

/** Map view for a typed city: its centre at city zoom, else all of India. */
export function cityView(city: string): { center: [number, number]; zoom: number } {
  const c = CITY_CENTRES[city.trim().toLowerCase()];
  return c ? { center: c, zoom: 11 } : { center: [22.5, 79], zoom: 4 };
}
