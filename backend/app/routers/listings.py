import math
from datetime import date, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.availability import booked_ranges, has_overlap, overlap_clause
from app.cards import rated_listings, rating_order, to_card
from app import clock
from app.clock import today
from app.db import get_db
from app.errors import AppError
from app.models import (
    Amenity, Booking, Listing, ListingPhoto, Review, User, listing_amenities,
)
from app.pricing import quote, validate_stay
from app.schemas import (
    HostOut, ListingCard, ListingDetail, ListingIn, ListingPatch, Page, PriceQuoteOut,
    RatingBreakdown, ReviewOut,
)
from app.security import current_user

router = APIRouter(prefix="/api/listings", tags=["listings"])

PAGE_SIZE = 18
REVIEWS_PAGE_SIZE = 10
SCORES = ("cleanliness", "accuracy", "checkin", "communication", "location", "value")


def _check_dates(check_in: date | None, check_out: date | None) -> None:
    if (check_in is None) != (check_out is None):
        raise AppError(422, "invalid_dates", "Pick both check-in and check-out dates.",
                       {"check_in": "Required with check_out.",
                        "check_out": "Required with check_in."})
    if check_in and check_out <= check_in:
        raise AppError(422, "invalid_dates", "Check-out must be after check-in.",
                       {"check_out": "Must be after check_in."})


def _csv(value: str | None) -> list[str]:
    return [v.strip() for v in value.split(",") if v.strip()] if value else []


def get_live_listing(db: Session, listing_id: int) -> Listing:
    listing = db.get(Listing, listing_id)
    if listing is None or listing.deleted_at is not None:
        raise AppError(404, "listing_not_found", "This listing does not exist.")
    return listing


@router.get("", response_model=Page[ListingCard])
def search(
    location: str | None = None,
    check_in: date | None = None,
    check_out: date | None = None,
    guests: int | None = Query(None, ge=1),
    min_price: int | None = None,
    max_price: int | None = None,
    place_type: str | None = None,
    property_types: str | None = None,
    amenities: str | None = None,
    bedrooms: int | None = None,
    beds: int | None = None,
    bathrooms: int | None = None,
    instant_book: bool | None = None,
    pets: bool | None = None,
    page: int = Query(1, ge=1),
    db: Session = Depends(get_db),
):
    _check_dates(check_in, check_out)
    query = rated_listings()
    if term := (location or "").strip():
        query = query.where(Listing.city.icontains(term, autoescape=True)
                            | Listing.state.icontains(term, autoescape=True)
                            | Listing.country.icontains(term, autoescape=True))
    if check_in:
        busy = select(Booking.id).where(Booking.listing_id == Listing.id,
                                        overlap_clause(check_in, check_out))
        query = query.where(~busy.exists())
    if guests:  # adults + children; infants and pets do not count toward max_guests
        query = query.where(Listing.max_guests >= guests)
    if min_price is not None:
        query = query.where(Listing.price_per_night >= min_price)
    if max_price is not None:
        query = query.where(Listing.price_per_night <= max_price)
    if place_type:
        query = query.where(Listing.place_type == place_type)
    if types := _csv(property_types):
        query = query.where(Listing.property_type.in_(types))
    if slugs := set(_csv(amenities)):  # the listing must have every requested amenity
        has_all = (
            select(listing_amenities.c.listing_id)
            .join(Amenity, Amenity.id == listing_amenities.c.amenity_id)
            .where(Amenity.slug.in_(slugs))
            .group_by(listing_amenities.c.listing_id)
            .having(func.count() == len(slugs))
        )
        query = query.where(Listing.id.in_(has_all))
    if bedrooms is not None:
        query = query.where(Listing.bedrooms >= bedrooms)
    if beds is not None:
        query = query.where(Listing.beds >= beds)
    if bathrooms is not None:
        query = query.where(Listing.bathrooms >= bathrooms)
    if instant_book:
        query = query.where(Listing.instant_book.is_(True))
    if pets:
        query = query.where(Listing.pets_allowed.is_(True))

    total = db.scalar(select(func.count()).select_from(query.order_by(None).subquery()))
    rows = db.execute(
        query.order_by(rating_order(), Listing.id).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE)
    ).all()
    return Page(
        items=[to_card(listing, rating, n, check_in, check_out) for listing, rating, n in rows],
        total=total, page=page, page_size=PAGE_SIZE, pages=math.ceil(total / PAGE_SIZE),
    )


def _avg(value) -> float | None:
    return round(value, 2) if value is not None else None


def _detail(db: Session, listing: Listing) -> ListingDetail:
    listing_id = listing.id
    averages = db.execute(
        select(func.avg(Review.rating), *(func.avg(getattr(Review, s)) for s in SCORES),
               func.count())
        .where(Review.listing_id == listing_id)
    ).one()
    stars = dict(db.execute(
        select(Review.rating, func.count()).where(Review.listing_id == listing_id)
        .group_by(Review.rating)
    ).all())
    breakdown = RatingBreakdown(
        overall=_avg(averages[0]), **{s: _avg(v) for s, v in zip(SCORES, averages[1:7])},
        distribution={n: stars.get(n, 0) for n in (5, 4, 3, 2, 1)},
    )
    # Host stats span all of the host's live listings.
    host_listings, host_reviews, host_rating = db.execute(
        select(func.count(func.distinct(Listing.id)), func.count(Review.id),
               func.avg(Review.rating))
        .select_from(Listing).outerjoin(Review, Review.listing_id == Listing.id)
        .where(Listing.host_id == listing.host_id, Listing.deleted_at.is_(None))
    ).one()
    host = listing.host
    card = to_card(listing, averages[0], averages[7]).model_dump()
    card["photos"] = [p.url for p in listing.photos]  # detail shows all, cards only 5
    return ListingDetail(
        **card,
        description=listing.description, address=listing.address, country=listing.country,
        amenities=sorted(listing.amenities, key=lambda a: (a.category, a.name)),
        host=HostOut(id=host.id, name=host.name, avatar_url=host.avatar_url, bio=host.bio,
                     joined_year=host.created_at.year, listing_count=host_listings,
                     review_count=host_reviews, rating=_avg(host_rating)),
        rating_breakdown=breakdown, pets_allowed=listing.pets_allowed,
        instant_book=listing.instant_book, cleaning_fee=listing.cleaning_fee,
        max_guests=listing.max_guests,
    )


@router.get("/{listing_id}", response_model=ListingDetail)
def detail(listing_id: int, db: Session = Depends(get_db)):
    return _detail(db, get_live_listing(db, listing_id))


def _amenities(db: Session, slugs: list[str]) -> list[Amenity]:
    wanted = set(slugs)
    found = db.scalars(select(Amenity).where(Amenity.slug.in_(wanted))).all()
    if missing := wanted - {a.slug for a in found}:
        raise AppError(422, "unknown_amenity", "Some amenities do not exist.",
                       {"amenity_slugs": f"Unknown: {', '.join(sorted(missing))}"})
    return list(found)


def _photos(urls: list[str]) -> list[ListingPhoto]:
    return [ListingPhoto(url=url, position=i) for i, url in enumerate(urls)]


@router.post("", response_model=ListingDetail, status_code=201)
def create_listing(body: ListingIn, db: Session = Depends(get_db),
                   user: User = Depends(current_user)):
    data = body.model_dump(exclude={"amenity_slugs", "photo_urls"})
    listing = Listing(host_id=user.id, **data, amenities=_amenities(db, body.amenity_slugs),
                      photos=_photos(body.photo_urls))
    db.add(listing)
    user.is_host = True  # creating a listing is what makes someone a host
    db.commit()
    return _detail(db, listing)


def _owned_listing(db: Session, listing_id: int, user: User) -> Listing:
    listing = get_live_listing(db, listing_id)
    if listing.host_id != user.id:
        raise AppError(403, "not_owner", "You can only change your own listings.")
    return listing


@router.patch("/{listing_id}", response_model=ListingDetail)
def update_listing(listing_id: int, body: ListingPatch, db: Session = Depends(get_db),
                   user: User = Depends(current_user)):
    listing = _owned_listing(db, listing_id, user)
    changes = body.model_dump(exclude_none=True)  # only the fields the client sent
    slugs, urls = changes.pop("amenity_slugs", None), changes.pop("photo_urls", None)
    for field, value in changes.items():
        setattr(listing, field, value)
    if slugs is not None:
        listing.amenities = _amenities(db, slugs)
    if urls is not None:
        listing.photos = _photos(urls)  # replaces the set; the old rows are orphan-deleted
    db.commit()
    return _detail(db, listing)


@router.delete("/{listing_id}", status_code=204)
def delete_listing(listing_id: int, db: Session = Depends(get_db),
                   user: User = Depends(current_user)):
    listing = _owned_listing(db, listing_id, user)
    upcoming = db.scalar(select(Booking.id).where(
        Booking.listing_id == listing.id, Booking.status == "confirmed",
        Booking.check_out > clock.today()).limit(1))
    if upcoming is not None:
        raise AppError(409, "has_upcoming_bookings",
                       "Cancel or finish the upcoming bookings before deleting this listing.")
    listing.deleted_at = func.now()  # soft delete: past trips and reviews still point here
    db.commit()
    return Response(status_code=204)


@router.get("/{listing_id}/availability")
def availability(listing_id: int, db: Session = Depends(get_db)):
    get_live_listing(db, listing_id)
    start = today()
    ranges = booked_ranges(db, listing_id, start, start + timedelta(days=365))
    return {"booked": [{"check_in": a.isoformat(), "check_out": b.isoformat()}
                       for a, b in ranges]}


@router.get("/{listing_id}/quote", response_model=PriceQuoteOut)
def price_quote(
    listing_id: int,
    check_in: date,
    check_out: date,
    adults: int = Query(1, ge=1),
    children: int = Query(0, ge=0),
    infants: int = Query(0, ge=0),
    pets: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    listing = get_live_listing(db, listing_id)
    validate_stay(listing, check_in, check_out, adults, children, infants, pets)
    if has_overlap(db, listing_id, check_in, check_out):
        raise AppError(409, "dates_unavailable", "Those dates are already booked.")
    return quote(listing.price_per_night, listing.cleaning_fee, check_in, check_out)


@router.get("/{listing_id}/reviews", response_model=Page[ReviewOut])
def reviews(
    listing_id: int,
    sort: Literal["recent", "highest", "lowest"] = "recent",
    page: int = Query(1, ge=1),
    db: Session = Depends(get_db),
):
    get_live_listing(db, listing_id)
    order = {
        "recent": (Review.created_at.desc(), Review.id.desc()),
        "highest": (Review.rating.desc(), Review.id.desc()),
        "lowest": (Review.rating.asc(), Review.id.desc()),
    }[sort]
    total = db.scalar(select(func.count()).where(Review.listing_id == listing_id))
    rows = db.scalars(
        select(Review).where(Review.listing_id == listing_id)
        .options(joinedload(Review.author))
        .order_by(*order).limit(REVIEWS_PAGE_SIZE).offset((page - 1) * REVIEWS_PAGE_SIZE)
    ).all()
    items = [ReviewOut(id=r.id, author_name=r.author.name, author_avatar_url=r.author.avatar_url,
                       author_joined_year=r.author.created_at.year, rating=r.rating,
                       comment=r.comment, created_at=r.created_at) for r in rows]
    return Page(items=items, total=total, page=page, page_size=REVIEWS_PAGE_SIZE,
                pages=math.ceil(total / REVIEWS_PAGE_SIZE))
