from fastapi import APIRouter, Depends
from psycopg import errors
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import clock
from app.availability import has_overlap
from app.cards import booking_out, listing_cards, reviewed_ids
from app.db import get_db
from app.errors import AppError
from app.models import Booking, Review, User
from app.pricing import quote, validate_stay
from app.routers.listings import get_live_listing, review_out
from app.schemas import BookingIn, BookingOut, Id, ReviewIn, ReviewOut
from app.security import current_user

router = APIRouter(prefix="/api/bookings", tags=["bookings"])


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
    # Friendly early answer; the exclusion constraint (models.py) is what makes it race-proof.
    if has_overlap(db, listing.id, body.check_in, body.check_out):
        raise AppError(409, "dates_unavailable", "Those dates are already booked.")
    q = quote(listing.price_per_night, listing.cleaning_fee, body.check_in, body.check_out)
    booking = Booking(listing_id=listing.id, guest_id=user.id, check_in=body.check_in,
                      check_out=body.check_out, adults=body.adults, children=body.children,
                      infants=body.infants, pets=body.pets, nights=q.nights,
                      nightly_price=q.nightly_price, cleaning_fee=q.cleaning_fee,
                      service_fee=q.service_fee, taxes=q.taxes, total=q.total)  # snapshot
    db.add(booking)
    try:
        db.commit()
    except IntegrityError as e:  # a concurrent booking took these nights after our check
        db.rollback()
        if not isinstance(e.orig, errors.ExclusionViolation):
            raise
        raise AppError(409, "dates_unavailable", "Those dates are already booked.")
    return booking_out(booking, listing_cards(db, {listing.id})[listing.id])


@router.get("/me", response_model=list[BookingOut])
def my_trips(db: Session = Depends(get_db), user: User = Depends(current_user)):
    bookings = db.scalars(select(Booking).where(Booking.guest_id == user.id)
                          .order_by(Booking.check_in.desc(), Booking.id.desc())).all()
    cards = listing_cards(db, {b.listing_id for b in bookings})
    reviewed = reviewed_ids(db, [b.id for b in bookings])
    return [booking_out(b, cards[b.listing_id], b.id in reviewed) for b in bookings]


@router.get("/{booking_id}", response_model=BookingOut)
def get_booking(booking_id: Id, db: Session = Depends(get_db),
                user: User = Depends(current_user)):
    booking = _get_booking(db, booking_id, user, guest_only=False)
    return booking_out(booking, listing_cards(db, {booking.listing_id})[booking.listing_id],
                       booking.id in reviewed_ids(db, [booking.id]))


@router.post("/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(booking_id: Id, db: Session = Depends(get_db),
                   user: User = Depends(current_user)):
    booking = _get_booking(db, booking_id, user, guest_only=True)
    if booking.status == "cancelled":
        raise AppError(409, "already_cancelled", "This booking is already cancelled.")
    if booking.check_in <= clock.today():
        raise AppError(409, "already_started", "A stay that has started cannot be cancelled.")
    booking.status = "cancelled"
    db.commit()
    return booking_out(booking, listing_cards(db, {booking.listing_id})[booking.listing_id])


@router.post("/{booking_id}/review", response_model=ReviewOut, status_code=201)
def review_stay(booking_id: Id, body: ReviewIn, db: Session = Depends(get_db),
                user: User = Depends(current_user)):
    booking = _get_booking(db, booking_id, user, guest_only=True)
    if booking.status == "cancelled":
        raise AppError(409, "booking_cancelled", "A cancelled booking cannot be reviewed.")
    if booking.check_out > clock.today():
        raise AppError(409, "stay_not_finished", "You can review this stay after checkout.")
    review = Review(booking_id=booking.id, listing_id=booking.listing_id, author_id=user.id,
                    **body.model_dump())
    db.add(review)
    try:
        db.commit()
    except IntegrityError as e:  # reviews.booking_id is unique: the database is the one check
        db.rollback()
        if not isinstance(e.orig, errors.UniqueViolation):
            raise
        raise AppError(409, "already_reviewed", "You have already reviewed this stay.")
    return review_out(review)
