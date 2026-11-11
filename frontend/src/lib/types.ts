// Mirrors backend/app/schemas.py. Dates arrive as ISO strings.

export interface User {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  is_host: boolean;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface ListingCard {
  id: number;
  title: string;
  city: string;
  state: string;
  property_type: string;
  place_type: string;
  photos: string[];
  price_per_night: number;
  nights: number | null;
  total: number | null;
  rating: number | null;
  review_count: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  latitude: number;
  longitude: number;
  created_at: string;
}

export interface HostListingCard extends ListingCard {
  upcoming_bookings: number;
}

export interface Amenity {
  slug: string;
  name: string;
  category: string;
}

export interface Host {
  id: number;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  joined_year: number;
  listing_count: number;
  review_count: number;
  rating: number | null;
  is_superhost?: boolean; // missing from an older backend: treat as not a Superhost
}

export interface RatingBreakdown {
  overall: number | null;
  cleanliness: number | null;
  accuracy: number | null;
  checkin: number | null;
  communication: number | null;
  location: number | null;
  value: number | null;
  distribution: Record<string, number>; // stars -> number of reviews
}

export interface ListingDetail extends ListingCard {
  description: string;
  address: string;
  country: string;
  amenities: Amenity[];
  host: Host;
  rating_breakdown: RatingBreakdown;
  pets_allowed: boolean;
  instant_book: boolean;
  cleaning_fee: number;
  max_guests: number;
}

export interface Review {
  id: number;
  author_name: string;
  author_avatar_url: string | null;
  author_joined_year: number;
  rating: number;
  comment: string;
  created_at: string;
}

export interface Destination {
  city: string;
  state: string;
  country: string;
  listing_count: number;
}

export interface PriceQuote {
  nights: number;
  nightly_price: number;
  subtotal: number;
  cleaning_fee: number;
  service_fee: number;
  taxes: number;
  total: number;
}

export interface Booking {
  id: number;
  listing: ListingCard;
  guest: { name: string; avatar_url: string | null } | null; // only on host reservations
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  infants: number;
  pets: number;
  nights: number;
  nightly_price: number;
  cleaning_fee: number;
  service_fee: number;
  taxes: number;
  total: number;
  status: string;
  created_at: string;
  reviewed?: boolean; // missing from an older backend: then no review button
}

export interface Wishlist {
  id: number;
  name: string;
  count: number;
  cover_photos: string[];
  updated_at: string;
}

export interface WishlistDetail {
  id: number;
  name: string;
  items: ListingCard[];
}
