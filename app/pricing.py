from dataclasses import dataclass
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from app import clock
from app.errors import AppError
from app.models import Listing

SERVICE_FEE_RATE = Decimal("0.14")  # mock rates, see design.md section 3
TAX_RATE = Decimal("0.05")


@dataclass
class PriceQuote:
    nights: int
    nightly_price: int
    subtotal: int
    cleaning_fee: int
    service_fee: int
    taxes: int
    total: int


def _round(x: Decimal) -> int:
    return int(x.quantize(Decimal(1), ROUND_HALF_UP))


def quote(nightly_price: int, cleaning_fee: int, check_in: date, check_out: date) -> PriceQuote:
    nights = (check_out - check_in).days
    subtotal = nights * nightly_price
    base = subtotal + cleaning_fee
    service_fee = _round(SERVICE_FEE_RATE * base)
    taxes = _round(TAX_RATE * base)
    return PriceQuote(nights, nightly_price, subtotal, cleaning_fee, service_fee, taxes,
                      base + service_fee + taxes)


def validate_stay(listing: Listing, check_in: date, check_out: date, adults: int, children: int,
                  infants: int, pets: int) -> None:
    """Raise AppError(422) if the dates or guest counts are not allowed for this listing."""
    if check_in < clock.today():
        raise AppError(422, "past_dates", "Check-in cannot be in the past.",
                       {"check_in": "Pick today or a later date."})
    if check_out <= check_in:
        raise AppError(422, "invalid_dates", "Check-out must be after check-in.",
                       {"check_out": "Must be after check_in."})
    if (check_out - check_in).days > 365:
        raise AppError(422, "too_long", "Stays are limited to 365 nights.")
    if adults < 1:
        raise AppError(422, "no_adults", "At least one adult is required.", {"adults": "Min 1."})
    if adults + children > listing.max_guests:  # infants and pets do not count
        raise AppError(422, "too_many_guests",
                       f"This place sleeps at most {listing.max_guests} guests.",
                       {"adults": "Too many guests."})
    if pets > 0 and not listing.pets_allowed:
        raise AppError(422, "pets_not_allowed", "This place does not allow pets.",
                       {"pets": "Not allowed."})
