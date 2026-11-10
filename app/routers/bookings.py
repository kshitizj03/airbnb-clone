from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import clock
from app.availability import has_overlap
from app.cards import rated_listings, to_card
from app.db import get_db
from app.errors import AppError
from app.models import Booking, Listing, User
from app.pricing import quote, validate_stay
from app.routers.listings import get_live_listing
from app.schemas import BookingIn, BookingOut, ListingCard
from app.security import current_user

router = APIRouter(prefix="/api/bookings", tags=["bookings"])


def _out(booking: Booking, card: ListingCard) -> BookingOut:
    return BookingOut(listing=card, **{f: getattr(booking, f) for f in (
        "id", "check_in", "check_out", "adults", "children", "infants", "pets", "nights",
        "nightly_price", "cleaning_fee", "service_fee", "taxes", "total", "status", "created_at")})


def _cards(db: Session, listing_ids: set[int]) -> dict[int, ListingCard]:
    """Cards by listing id in one query (plus photos). Includes soft-deleted listings, so a
    guest's past trip still renders."""
    rows = db.execute(rated_listings(include_deleted=True).where(Listing.id.in_(listing_ids)))
    return {listing.id: to_card(listing, rating, n) for listing, rating, n in rows}


def _get_booking(db: Session, booking_id: int, user: User, guest_only: bool) -> Booking:
    booking = db.get(Booking, booking_id)
    allowed = booking is not None and (
        booking.guest_id == user.id or (not guest_only and booking.listing.host_id == user.id))
    if not allowed:
        raise AppError(404, "booking_not_found", "This booking does not exist.")
    return booking


@router.post("", response_model=BookingOut, status_code=201)
def create_booking(body: BookingIn, db: Session = Depends(get_db),
                   user: User = Depends(current_user)):
    listing = get_live_listing(db, body.listing_id)
    validate_stay(listing, body.check_in, body.check_out, body.adults, body.children,
                  body.infants, body.pets)
    if listing.host_id == user.id:
        raise AppError(403, "own_listing", "You cannot book your own listing.")
    # The transaction began with BEGIN IMMEDIATE (db.py), so no other writer can insert between
    # this check and the commit below: the check and the insert are atomic.
    if has_overlap(db, listing.id, body.check_in, body.check_out):
        raise AppError(409, "dates_unavailable", "Those dates are already booked.")
    q = quote(listing.price_per_night, listing.cleaning_fee, body.check_in, body.check_out)
    booking = Booking(listing_id=listing.id, guest_id=user.id, check_in=body.check_in,
                      check_out=body.check_out, adults=body.adults, children=body.children,
                      infants=body.infants, pets=body.pets, nights=q.nights,
                      nightly_price=q.nightly_price, cleaning_fee=q.cleaning_fee,
                      service_fee=q.service_fee, taxes=q.taxes, total=q.total)  # snapshot
    db.add(booking)
    db.commit()
    return _out(booking, _cards(db, {listing.id})[listing.id])


@router.get("/me", response_model=list[BookingOut])
def my_trips(db: Session = Depends(get_db), user: User = Depends(current_user)):
    bookings = db.scalars(select(Booking).where(Booking.guest_id == user.id)
                          .order_by(Booking.check_in.desc(), Booking.id.desc())).all()
    cards = _cards(db, {b.listing_id for b in bookings})
    return [_out(b, cards[b.listing_id]) for b in bookings]


@router.get("/{booking_id}", response_model=BookingOut)
def get_booking(booking_id: int, db: Session = Depends(get_db),
                user: User = Depends(current_user)):
    booking = _get_booking(db, booking_id, user, guest_only=False)
    return _out(booking, _cards(db, {booking.listing_id})[booking.listing_id])


@router.post("/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(booking_id: int, db: Session = Depends(get_db),
                   user: User = Depends(current_user)):
    booking = _get_booking(db, booking_id, user, guest_only=True)
    if booking.status == "cancelled":
        raise AppError(409, "already_cancelled", "This booking is already cancelled.")
    if booking.check_in <= clock.today():
        raise AppError(409, "already_started", "A stay that has started cannot be cancelled.")
    booking.status = "cancelled"
    db.commit()
    return _out(booking, _cards(db, {booking.listing_id})[booking.listing_id])
