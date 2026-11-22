from datetime import date, datetime
from typing import Annotated, Generic, Literal, TypeVar
from urllib.parse import urlsplit

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    StringConstraints,
    field_validator,
)

DB_INT_MAX = 2**31 - 1  # Postgres integer; a bigger id or count must fail here, not in SQL
Id = Annotated[int, Field(ge=1, le=DB_INT_MAX)]  # path, query and body ids

MAX_PRICE = 1_000_000  # rupees, for the nightly price and the cleaning fee
MAX_GUESTS = 16  # adults + children; infants and pets are counted separately
MAX_INFANTS = 5
MAX_PETS = 5


def _text(max_length: int):
    """Trimmed text that must not be blank."""
    return Annotated[str, StringConstraints(strip_whitespace=True, min_length=1,
                                            max_length=max_length)]


Name = _text(100)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    avatar_url: str | None
    is_host: bool


class SignupIn(BaseModel):
    name: Name
    email: EmailStr
    password: str = Field(min_length=8)

    @field_validator("password")
    @classmethod
    def password_fits_bcrypt(cls, v: str) -> str:
        if len(v.encode()) > 72:  # bcrypt only accepts 72 bytes
            raise ValueError("Password must be at most 72 bytes.")
        return v


class LoginIn(BaseModel):
    email: str
    password: str


class DemoIn(BaseModel):
    role: Literal["guest", "host"]


T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int


class ListingCard(BaseModel):
    id: int
    title: str
    city: str
    state: str
    property_type: str
    place_type: str
    photos: list[str]
    price_per_night: int
    nights: int | None
    total: int | None
    rating: float | None
    review_count: int
    bedrooms: int
    beds: int
    bathrooms: int
    latitude: float
    longitude: float
    created_at: datetime


class AmenityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    slug: str
    name: str
    category: str


class HostOut(BaseModel):
    id: int
    name: str
    avatar_url: str | None
    bio: str | None
    joined_year: int
    listing_count: int
    review_count: int
    rating: float | None
    is_superhost: bool


class RatingBreakdown(BaseModel):
    overall: float | None
    cleanliness: float | None
    accuracy: float | None
    checkin: float | None
    communication: float | None
    location: float | None
    value: float | None
    distribution: dict[int, int]  # stars -> number of reviews


class HostListingCard(ListingCard):
    upcoming_bookings: int


class ListingDetail(ListingCard):
    description: str
    address: str
    country: str
    amenities: list[AmenityOut]
    host: HostOut
    rating_breakdown: RatingBreakdown
    pets_allowed: bool
    instant_book: bool
    cleaning_fee: int
    max_guests: int


class ReviewOut(BaseModel):
    id: int
    author_name: str
    author_avatar_url: str | None
    author_joined_year: int
    rating: int
    comment: str
    created_at: datetime


Score = Annotated[int, Field(ge=1, le=5)]


class ReviewIn(BaseModel):
    rating: Score
    cleanliness: Score
    accuracy: Score
    checkin: Score
    communication: Score
    location: Score
    value: Score
    comment: _text(1000)


class DestinationOut(BaseModel):
    city: str
    state: str
    country: str
    listing_count: int


class PriceQuoteOut(BaseModel):
    nights: int
    nightly_price: int
    subtotal: int
    cleaning_fee: int
    service_fee: int
    taxes: int
    total: int


class BookingIn(BaseModel):
    listing_id: Id
    check_in: date
    check_out: date
    adults: int = Field(1, le=MAX_GUESTS)  # validate_stay gives "no_adults" for < 1
    children: int = Field(0, ge=0, le=MAX_GUESTS)
    infants: int = Field(0, ge=0, le=MAX_INFANTS)
    pets: int = Field(0, ge=0, le=MAX_PETS)


class GuestOut(BaseModel):
    name: str
    avatar_url: str | None


class BookingOut(BaseModel):
    id: int
    listing: ListingCard
    guest: GuestOut | None = None  # only filled on host reservations
    check_in: date
    check_out: date
    adults: int
    children: int
    infants: int
    pets: int
    nights: int
    nightly_price: int
    cleaning_fee: int
    service_fee: int
    taxes: int
    total: int
    status: str
    created_at: datetime
    reviewed: bool  # the guest has reviewed this stay


def _photo_url(url: str) -> str:
    """Photos are seeded Unsplash images or uploads to our Vercel Blob store, nothing else.
    lib/listing-draft.ts (isPhotoUrl) applies the same rule in the browser."""
    parts = urlsplit(url)
    host = parts.hostname or ""
    if parts.scheme != "https" or not (
            host == "images.unsplash.com" or host.endswith(".public.blob.vercel-storage.com")):
        raise ValueError("Use an https link from images.unsplash.com, or upload the photo.")
    return url


# Field types shared by create and patch, so the limits are written once (same as the UI's).
Title = _text(50)
Description = _text(500)
Place = _text(120)  # address, city, state, country
Latitude = Annotated[float, Field(ge=-90, le=90)]  # range checks also reject NaN
Longitude = Annotated[float, Field(ge=-180, le=180)]
PropertyType = Literal["house", "flat", "guest_house", "hotel"]
PlaceType = Literal["entire_home", "private_room", "shared_room"]
Price = Annotated[int, Field(gt=0, le=MAX_PRICE)]
Fee = Annotated[int, Field(ge=0, le=MAX_PRICE)]
Guests = Annotated[int, Field(ge=1, le=MAX_GUESTS)]
Bedrooms = Annotated[int, Field(ge=0, le=50)]
Count = Annotated[int, Field(ge=1, le=50)]
PhotoUrls = Annotated[list[Annotated[str, StringConstraints(strip_whitespace=True, max_length=2048),
                                     AfterValidator(_photo_url)]],
                      Field(min_length=1, max_length=20)]


class ListingIn(BaseModel):
    title: Title
    description: Description
    property_type: PropertyType
    place_type: PlaceType
    address: Place
    city: Place
    state: Place
    country: Place
    latitude: Latitude
    longitude: Longitude
    price_per_night: Price
    cleaning_fee: Fee
    max_guests: Guests
    bedrooms: Bedrooms
    beds: Count
    bathrooms: Count
    pets_allowed: bool
    instant_book: bool
    amenity_slugs: list[str]
    photo_urls: PhotoUrls


class ListingPatch(BaseModel):
    title: Title | None = None
    description: Description | None = None
    property_type: PropertyType | None = None
    place_type: PlaceType | None = None
    address: Place | None = None
    city: Place | None = None
    state: Place | None = None
    country: Place | None = None
    latitude: Latitude | None = None
    longitude: Longitude | None = None
    price_per_night: Price | None = None
    cleaning_fee: Fee | None = None
    max_guests: Guests | None = None
    bedrooms: Bedrooms | None = None
    beds: Count | None = None
    bathrooms: Count | None = None
    pets_allowed: bool | None = None
    instant_book: bool | None = None
    amenity_slugs: list[str] | None = None
    photo_urls: PhotoUrls | None = None


class WishlistIn(BaseModel):
    name: _text(50)  # the create-wishlist modal's limit
    listing_id: Id | None = None


class SaveIn(BaseModel):
    listing_id: Id


class WishlistOut(BaseModel):
    id: int
    name: str
    count: int
    cover_photos: list[str]  # first photo of up to 4 most recently saved listings
    updated_at: datetime


class WishlistDetail(BaseModel):
    id: int
    name: str
    items: list[ListingCard]
