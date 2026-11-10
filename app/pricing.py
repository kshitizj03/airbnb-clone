from dataclasses import dataclass
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

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
