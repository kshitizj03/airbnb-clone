from datetime import date, datetime

from sqlalchemy import (
    Boolean, CheckConstraint, Column, Date, DateTime, ForeignKey, Index, Integer, String, Table,
    Text, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

listing_amenities = Table(
    "listing_amenities",
    Base.metadata,
    Column("listing_id", ForeignKey("listings.id", ondelete="CASCADE"), primary_key=True),
    Column("amenity_id", ForeignKey("amenities.id", ondelete="CASCADE"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True)
    password_hash: Mapped[str] = mapped_column(String)
    name: Mapped[str] = mapped_column(String)
    avatar_url: Mapped[str | None] = mapped_column(String)
    bio: Mapped[str | None] = mapped_column(Text)
    is_host: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Listing(Base):
    __tablename__ = "listings"
    __table_args__ = (
        CheckConstraint("price_per_night > 0", name="ck_listing_price"),
        CheckConstraint("cleaning_fee >= 0", name="ck_listing_cleaning"),
        CheckConstraint("max_guests >= 1", name="ck_listing_guests"),
        CheckConstraint("bedrooms >= 0", name="ck_listing_bedrooms"),
        CheckConstraint("beds >= 1", name="ck_listing_beds"),
        CheckConstraint("bathrooms >= 1", name="ck_listing_bathrooms"),
        CheckConstraint(
            "property_type IN ('house','flat','guest_house','hotel')", name="ck_listing_property"
        ),
        CheckConstraint(
            "place_type IN ('entire_home','private_room','shared_room')", name="ck_listing_place"
        ),
        Index("ix_listings_city", "city"),
        Index("ix_listings_host_id", "host_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    host_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text)
    property_type: Mapped[str] = mapped_column(String)
    place_type: Mapped[str] = mapped_column(String)
    address: Mapped[str] = mapped_column(String)
    city: Mapped[str] = mapped_column(String)
    state: Mapped[str] = mapped_column(String)
    country: Mapped[str] = mapped_column(String)
    latitude: Mapped[float] = mapped_column()
    longitude: Mapped[float] = mapped_column()
    price_per_night: Mapped[int] = mapped_column(Integer)
    cleaning_fee: Mapped[int] = mapped_column(Integer)
    max_guests: Mapped[int] = mapped_column(Integer)
    bedrooms: Mapped[int] = mapped_column(Integer)
    beds: Mapped[int] = mapped_column(Integer)
    bathrooms: Mapped[int] = mapped_column(Integer)
    pets_allowed: Mapped[bool] = mapped_column(Boolean, default=False)
    instant_book: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime)

    host: Mapped[User] = relationship()
    photos: Mapped[list["ListingPhoto"]] = relationship(
        order_by="ListingPhoto.position", cascade="all, delete-orphan", passive_deletes=True
    )
    amenities: Mapped[list["Amenity"]] = relationship(secondary=listing_amenities)
    reviews: Mapped[list["Review"]] = relationship(back_populates="listing")


class ListingPhoto(Base):
    __tablename__ = "listing_photos"

    id: Mapped[int] = mapped_column(primary_key=True)
    listing_id: Mapped[int] = mapped_column(ForeignKey("listings.id", ondelete="CASCADE"))
    url: Mapped[str] = mapped_column(String)
    position: Mapped[int] = mapped_column(Integer)  # 0 = cover


class Amenity(Base):
    __tablename__ = "amenities"
    __table_args__ = (
        CheckConstraint(
            "category IN ('basics','popular','features','location','safety')", name="ck_amenity_cat"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String, unique=True)
    name: Mapped[str] = mapped_column(String)
    category: Mapped[str] = mapped_column(String)


class Booking(Base):
    __tablename__ = "bookings"
    __table_args__ = (
        CheckConstraint("check_out > check_in", name="ck_booking_dates"),
        CheckConstraint("adults >= 1", name="ck_booking_adults"),
        CheckConstraint("status IN ('confirmed','cancelled')", name="ck_booking_status"),
        Index("ix_bookings_listing_dates", "listing_id", "check_in", "check_out"),
        Index("ix_bookings_guest_id", "guest_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    listing_id: Mapped[int] = mapped_column(ForeignKey("listings.id"))
    guest_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    check_in: Mapped[date] = mapped_column(Date)
    check_out: Mapped[date] = mapped_column(Date)
    adults: Mapped[int] = mapped_column(Integer, default=1)
    children: Mapped[int] = mapped_column(Integer, default=0)
    infants: Mapped[int] = mapped_column(Integer, default=0)
    pets: Mapped[int] = mapped_column(Integer, default=0)
    nights: Mapped[int] = mapped_column(Integer)
    nightly_price: Mapped[int] = mapped_column(Integer)
    cleaning_fee: Mapped[int] = mapped_column(Integer)
    service_fee: Mapped[int] = mapped_column(Integer)
    taxes: Mapped[int] = mapped_column(Integer)
    total: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String, default="confirmed")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    listing: Mapped[Listing] = relationship()
    guest: Mapped[User] = relationship()


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = tuple(
        CheckConstraint(f"{col} BETWEEN 1 AND 5", name=f"ck_review_{col}")
        for col in ("rating", "cleanliness", "accuracy", "checkin", "communication", "location",
                    "value")
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey("bookings.id"), unique=True)
    listing_id: Mapped[int] = mapped_column(ForeignKey("listings.id"))
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    rating: Mapped[int] = mapped_column(Integer)
    cleanliness: Mapped[int] = mapped_column(Integer)
    accuracy: Mapped[int] = mapped_column(Integer)
    checkin: Mapped[int] = mapped_column(Integer)
    communication: Mapped[int] = mapped_column(Integer)
    location: Mapped[int] = mapped_column(Integer)
    value: Mapped[int] = mapped_column(Integer)
    comment: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    booking: Mapped[Booking] = relationship()
    listing: Mapped[Listing] = relationship(back_populates="reviews")
    author: Mapped[User] = relationship()


class Wishlist(Base):
    __tablename__ = "wishlists"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    items: Mapped[list["WishlistItem"]] = relationship(
        cascade="all, delete-orphan", passive_deletes=True
    )


class WishlistItem(Base):
    __tablename__ = "wishlist_items"

    wishlist_id: Mapped[int] = mapped_column(
        ForeignKey("wishlists.id", ondelete="CASCADE"), primary_key=True
    )
    listing_id: Mapped[int] = mapped_column(
        ForeignKey("listings.id", ondelete="CASCADE"), primary_key=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
