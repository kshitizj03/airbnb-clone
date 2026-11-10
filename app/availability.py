from datetime import date

from sqlalchemy import and_, exists, select
from sqlalchemy.orm import Session

from app.models import Booking


def overlap_clause(check_in: date, check_out: date):
    """Confirmed bookings overlapping the half-open range [check_in, check_out)."""
    return and_(Booking.status == "confirmed", Booking.check_in < check_out,
                Booking.check_out > check_in)


def has_overlap(db: Session, listing_id: int, check_in: date, check_out: date,
                exclude_booking_id: int | None = None) -> bool:
    query = select(Booking.id).where(Booking.listing_id == listing_id,
                                     overlap_clause(check_in, check_out))
    if exclude_booking_id is not None:
        query = query.where(Booking.id != exclude_booking_id)
    return db.scalar(select(exists(query))) is True


def booked_ranges(db: Session, listing_id: int, start: date, end: date) -> list[tuple[date, date]]:
    rows = db.execute(
        select(Booking.check_in, Booking.check_out)
        .where(Booking.listing_id == listing_id, overlap_clause(start, end))
        .order_by(Booking.check_in)
    )
    return [(r.check_in, r.check_out) for r in rows]
