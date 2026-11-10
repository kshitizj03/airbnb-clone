from datetime import date, datetime
from typing import Annotated, Generic, Literal, TypeVar

from pydantic import AfterValidator, BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    avatar_url: str | None
    is_host: bool


class SignupIn(BaseModel):
    name: str = Field(min_length=1)
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
    listing_id: int
    check_in: date
    check_out: date
    adults: int = 1
    children: int = Field(0, ge=0)
    infants: int = Field(0, ge=0)
    pets: int = Field(0, ge=0)


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


def _photo_url(url: str) -> str:
    if not url.startswith(("http://", "https://", "/uploads/")):
        raise ValueError("Must start with http://, https:// or /uploads/.")
    return url


# Field types shared by create and patch, so the limits are written once.
Title = Annotated[str, Field(min_length=1, max_length=50)]
Description = Annotated[str, Field(min_length=1, max_length=500)]
Text = Annotated[str, Field(min_length=1)]
PropertyType = Literal["house", "flat", "guest_house", "hotel"]
PlaceType = Literal["entire_home", "private_room", "shared_room"]
Price = Annotated[int, Field(gt=0, le=1_000_000)]
Fee = Annotated[int, Field(ge=0)]
Guests = Annotated[int, Field(ge=1, le=16)]
Bedrooms = Annotated[int, Field(ge=0, le=50)]
Count = Annotated[int, Field(ge=1, le=50)]
PhotoUrls = Annotated[list[Annotated[str, AfterValidator(_photo_url)]],
                      Field(min_length=1, max_length=20)]


class ListingIn(BaseModel):
    title: Title
    description: Description
    property_type: PropertyType
    place_type: PlaceType
    address: Text
    city: Text
    state: Text
    country: Text
    latitude: float
    longitude: float
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
    address: Text | None = None
    city: Text | None = None
    state: Text | None = None
    country: Text | None = None
    latitude: float | None = None
    longitude: float | None = None
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
