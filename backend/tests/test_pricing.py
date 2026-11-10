from datetime import date

from app.pricing import quote


def test_quote_matches_airbnb_style_breakdown():
    q = quote(4200, 500, date(2026, 12, 10), date(2026, 12, 14))
    assert (q.nights, q.subtotal) == (4, 16800)
    assert q.service_fee == 2422  # round(0.14 * 17300)
    assert q.taxes == 865  # round(0.05 * 17300)
    assert q.total == 16800 + 500 + 2422 + 865
