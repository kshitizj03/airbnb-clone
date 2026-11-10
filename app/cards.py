from datetime import date

from sqlalchemy import Select, func, select
from sqlalchemy.orm import selectinload

from app.models import Listing, Review
from app.pricing import quote
from app.schemas import ListingCard

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
