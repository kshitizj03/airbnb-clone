from typing import Literal

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app import clock
from app.cards import rated_listings, to_card
from app.db import get_db
from app.errors import AppError
from app.models import Booking, Listing, User
from app.routers.bookings import _cards, _out
from app.schemas import BookingOut, GuestOut, HostListingCard
from app.security import current_user

router = APIRouter(prefix="/api/host", tags=["host"])


@router.get("/listings", response_model=list[HostListingCard])
def my_listings(db: Session = Depends(get_db), user: User = Depends(current_user)):
    rows = db.execute(rated_listings().where(Listing.host_id == user.id)
                      .order_by(Listing.created_at.desc(), Listing.id.desc())).all()
    upcoming = dict(db.execute(  # one grouped query instead of one count per listing
        select(Booking.listing_id, func.count())
        .join(Listing).where(Listing.host_id == user.id, Booking.status == "confirmed",
                             Booking.check_out > clock.today())
        .group_by(Booking.listing_id)
    ).all())
    return [HostListingCard(**to_card(listing, rating, n).model_dump(),
                            upcoming_bookings=upcoming.get(listing.id, 0))
            for listing, rating, n in rows]


@router.get("/reservations", response_model=list[BookingOut])
def reservations(status: Literal["upcoming", "past", "cancelled"] = "upcoming",
                 listing_id: int | None = None, db: Session = Depends(get_db),
                 user: User = Depends(current_user)):
    query = (select(Booking).join(Listing).where(Listing.host_id == user.id)
             .options(joinedload(Booking.guest)))
    if listing_id is not None:
        owned = db.scalar(select(Listing.id).where(Listing.id == listing_id,
                                                   Listing.host_id == user.id,
                                                   Listing.deleted_at.is_(None)))
        if owned is None:
            raise AppError(404, "listing_not_found", "This listing does not exist.")
        query = query.where(Booking.listing_id == listing_id)
    today = clock.today()
    if status == "upcoming":
        query = query.where(Booking.status == "confirmed", Booking.check_out > today)
        query = query.order_by(Booking.check_in, Booking.id)
    elif status == "past":
        query = query.where(Booking.status == "confirmed", Booking.check_out <= today)
        query = query.order_by(Booking.check_in.desc(), Booking.id.desc())
    else:
        query = query.where(Booking.status == "cancelled")
        query = query.order_by(Booking.check_in.desc(), Booking.id.desc())
    bookings = db.scalars(query).all()
    cards = _cards(db, {b.listing_id for b in bookings})
    result = []
    for b in bookings:
        out = _out(b, cards[b.listing_id])
        out.guest = GuestOut(name=b.guest.name, avatar_url=b.guest.avatar_url)
        result.append(out)
    return result
