from datetime import date

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session, selectinload

from app.models import Booking, Listing, Review
from app.pricing import quote
from app.schemas import BookingOut, ListingCard

# One row per listing with its rating stats, so a page of cards never costs a query per card.
_stats = (
    select(Review.listing_id, func.avg(Review.rating).label("rating"),
           func.count().label("review_count"))
    .group_by(Review.listing_id)
    .subquery()
)


def rated_listings(include_deleted: bool = False) -> Select:
    """Select of (Listing, rating, review_count), photos preloaded; live listings by default."""
    query = (
        select(Listing, _stats.c.rating, func.coalesce(_stats.c.review_count, 0))
        .outerjoin(_stats, _stats.c.listing_id == Listing.id)
        .options(selectinload(Listing.photos))
    )
    return query if include_deleted else query.where(Listing.deleted_at.is_(None))


def rating_order():
    return func.coalesce(_stats.c.rating, 0).desc()


def to_card(listing: Listing, rating: float | None, review_count: int,
            check_in: date | None = None, check_out: date | None = None) -> ListingCard:
    priced = (quote(listing.price_per_night, listing.cleaning_fee, check_in, check_out)
              if check_in and check_out else None)
    return ListingCard(
        **{f: getattr(listing, f) for f in (
            "id", "title", "city", "state", "property_type", "place_type", "price_per_night",
            "bedrooms", "beds", "bathrooms", "latitude", "longitude", "created_at")},
        photos=[p.url for p in listing.photos[:5]],
        nights=priced.nights if priced else None,
        total=priced.total if priced else None,
        rating=round(rating, 2) if rating is not None else None,
        review_count=review_count,
    )


# --- bookings as cards (guest trips and host reservations) ---

def listing_cards(db: Session, listing_ids: set[int]) -> dict[int, ListingCard]:
    """Cards by listing id in one query (plus photos). Includes soft-deleted listings, so a
    guest's past trip still renders."""
    rows = db.execute(rated_listings(include_deleted=True).where(Listing.id.in_(listing_ids)))
    return {listing.id: to_card(listing, rating, n) for listing, rating, n in rows}


def reviewed_ids(db: Session, booking_ids: list[int]) -> set[int]:
    """Which of these bookings have a review, in one query."""
    return set(db.scalars(select(Review.booking_id).where(Review.booking_id.in_(booking_ids))))


def booking_out(booking: Booking, card: ListingCard, reviewed: bool = False) -> BookingOut:
    return BookingOut(listing=card, reviewed=reviewed, **{f: getattr(booking, f) for f in (
        "id", "check_in", "check_out", "adults", "children", "infants", "pets", "nights",
        "nightly_price", "cleaning_fee", "service_fee", "taxes", "total", "status", "created_at")})
