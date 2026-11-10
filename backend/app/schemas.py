from datetime import datetime
from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


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
