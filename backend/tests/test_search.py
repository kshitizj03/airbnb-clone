from datetime import date, datetime, timedelta

from app.clock import today
from app.models import Amenity
from app.pricing import quote
from tests.factories import make_booking, make_listing, make_review, make_user


def _ids(r):
    assert r.status_code == 200, r.text
    return [i["id"] for i in r.json()["items"]]


def test_search_location_case_insensitive(client, db):
    host = make_user(db, "h@x.com")
    goa = make_listing(db, host, city="Goa", state="Goa")
    jaipur = make_listing(db, host, city="Jaipur", state="Rajasthan")
    assert _ids(client.get("/api/listings", params={"location": "gOA"})) == [goa.id]
    assert _ids(client.get("/api/listings", params={"location": "rajas"})) == [jaipur.id]


def test_search_excludes_overlapping_confirmed_booking(client, db):
    host, guest = make_user(db, "h@x.com"), make_user(db, "g@x.com")
    listing = make_listing(db, host)
    make_booking(db, listing, guest, date(2027, 1, 10), date(2027, 1, 14))
    hidden = client.get("/api/listings", params={"check_in": "2027-01-12", "check_out": "2027-01-15"})
    assert _ids(hidden) == []
    shown = client.get("/api/listings", params={"check_in": "2027-01-14", "check_out": "2027-01-16"})
    assert _ids(shown) == [listing.id]


def test_search_ignores_cancelled_bookings(client, db):
    host, guest = make_user(db, "h@x.com"), make_user(db, "g@x.com")
    listing = make_listing(db, host)
    make_booking(db, listing, guest, date(2027, 1, 10), date(2027, 1, 14), status="cancelled")
    r = client.get("/api/listings", params={"check_in": "2027-01-12", "check_out": "2027-01-15"})
    assert _ids(r) == [listing.id]


def test_search_guests_counts_adults_children_only(client, db):
    host = make_user(db, "h@x.com")
    small = make_listing(db, host, max_guests=2)
    big = make_listing(db, host, max_guests=6)
    assert _ids(client.get("/api/listings", params={"guests": 3})) == [big.id]
    assert sorted(_ids(client.get("/api/listings", params={"guests": 2}))) == [small.id, big.id]


def test_search_price_and_amenities_filters(client, db):
    host = make_user(db, "h@x.com")
    wifi = Amenity(slug="wifi", name="Wifi", category="basics")
    pool = Amenity(slug="pool", name="Pool", category="popular")
    db.add_all([wifi, pool])
    cheap = make_listing(db, host, price_per_night=1000)
    mid = make_listing(db, host, price_per_night=3000)
    mid.amenities = [wifi, pool]
    only_wifi = make_listing(db, host, price_per_night=3500)
    only_wifi.amenities = [wifi]
    db.commit()
    price = {"min_price": 2000, "max_price": 3200}
    assert _ids(client.get("/api/listings", params=price)) == [mid.id]
    assert _ids(client.get("/api/listings", params={"amenities": "wifi,pool"})) == [mid.id]
    assert sorted(_ids(client.get("/api/listings", params={"amenities": "wifi"}))) == [mid.id, only_wifi.id]
    assert cheap.id not in _ids(client.get("/api/listings", params={"min_price": 2000}))


def test_search_check_in_without_check_out_422(client):
    r = client.get("/api/listings", params={"check_in": "2027-01-12"})
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "invalid_dates"
    r = client.get("/api/listings", params={"check_in": "2027-01-12", "check_out": "2027-01-12"})
    assert r.status_code == 422
    assert client.get("/api/listings", params={"page": 0}).status_code == 422


def test_search_paginates_18(client, db):
    host = make_user(db, "h@x.com")
    for _ in range(20):
        make_listing(db, host)
    p2 = client.get("/api/listings", params={"page": 2}).json()
    assert len(p2["items"]) == 2
    assert (p2["total"], p2["pages"], p2["page"], p2["page_size"]) == (20, 2, 2, 18)


def test_search_orders_by_rating_and_cards_have_rating(client, db):
    host, guest = make_user(db, "h@x.com"), make_user(db, "g@x.com")
    plain = make_listing(db, host)
    good = make_listing(db, host)
    make_review(db, make_booking(db, good, guest, date(2026, 1, 1), date(2026, 1, 3)), rating=5)
    make_review(db, make_booking(db, good, guest, date(2026, 2, 1), date(2026, 2, 3)), rating=4)
    items = client.get("/api/listings").json()["items"]
    assert [i["id"] for i in items] == [good.id, plain.id]
    assert items[0]["rating"] == 4.5 and items[0]["review_count"] == 2
    assert items[1]["rating"] is None and items[1]["total"] is None and items[1]["nights"] is None


def test_card_total_matches_pricing(client, db):
    host = make_user(db, "h@x.com")
    make_listing(db, host, price_per_night=4200, cleaning_fee=500)
    params = {"check_in": "2026-12-10", "check_out": "2026-12-14"}
    item = client.get("/api/listings", params=params).json()["items"][0]
    assert item["nights"] == 4
    assert item["total"] == quote(4200, 500, date(2026, 12, 10), date(2026, 12, 14)).total == 20587


def test_detail_and_404_for_deleted(client, db):
    host, guest = make_user(db, "h@x.com"), make_user(db, "g@x.com")
    listing = make_listing(db, host)
    booking = make_booking(db, listing, guest, date(2026, 1, 1), date(2026, 1, 3))
    make_review(db, booking, rating=4, cleanliness=3)
    d = client.get(f"/api/listings/{listing.id}").json()
    assert d["host"]["id"] == host.id and d["host"]["listing_count"] == 1
    assert d["host"]["review_count"] == 1
    assert d["rating_breakdown"]["cleanliness"] == 3
    assert d["rating_breakdown"]["distribution"]["4"] == 1
    gone = make_listing(db, host)
    gone.deleted_at = datetime(2026, 1, 1)
    db.commit()
    for path in (f"/api/listings/{gone.id}", f"/api/listings/{gone.id}/reviews",
                 f"/api/listings/{gone.id}/availability", "/api/listings/9999"):
        r = client.get(path)
        assert r.status_code == 404 and r.json()["error"]["code"] == "listing_not_found"
    assert _ids(client.get("/api/listings")) == [listing.id]


def test_availability_returns_booked_ranges(client, db):
    host, guest = make_user(db, "h@x.com"), make_user(db, "g@x.com")
    listing = make_listing(db, host)
    a = today() + timedelta(days=10)
    make_booking(db, listing, guest, a, a + timedelta(days=3))
    make_booking(db, listing, guest, a + timedelta(days=20), a + timedelta(days=22), status="cancelled")
    make_booking(db, listing, guest, today() + timedelta(days=400), today() + timedelta(days=402))
    r = client.get(f"/api/listings/{listing.id}/availability")
    assert r.json() == {"booked": [{"check_in": a.isoformat(),
                                    "check_out": (a + timedelta(days=3)).isoformat()}]}


def test_reviews_sorted_highest(client, db):
    host, guest = make_user(db, "h@x.com"), make_user(db, "g@x.com")
    listing = make_listing(db, host)
    for i, rating in enumerate((3, 5, 4)):
        start = date(2026, 1, 1 + 3 * i)
        booking = make_booking(db, listing, guest, start, start + timedelta(days=2))
        make_review(db, booking, rating=rating)
    path = f"/api/listings/{listing.id}/reviews"
    r = client.get(path, params={"sort": "highest"}).json()
    assert [x["rating"] for x in r["items"]] == [5, 4, 3]
    assert r["total"] == 3 and r["items"][0]["author_name"] == "U"
    assert client.get(path, params={"sort": "bogus"}).status_code == 422


def test_meta_amenities_and_destinations(client, db):
    host = make_user(db, "h@x.com")
    db.add_all([Amenity(slug="wifi", name="Wifi", category="basics"),
                Amenity(slug="ac", name="AC", category="basics"),
                Amenity(slug="pool", name="Pool", category="popular")])
    for city in ("Goa", "Goa", "Jaipur"):
        make_listing(db, host, city=city)
    assert [a["slug"] for a in client.get("/api/amenities").json()] == ["ac", "wifi", "pool"]
    top = client.get("/api/destinations").json()
    assert top[0] == {"city": "Goa", "state": "Goa", "country": "India", "listing_count": 2}
    found = client.get("/api/destinations", params={"q": "jai"}).json()
    assert [d["city"] for d in found] == ["Jaipur"]


def test_detail_returns_all_photos_cards_five(client, db):
    from app.models import ListingPhoto
    host = make_user(db, "h@x.com")
    listing = make_listing(db, host)
    listing.photos = [ListingPhoto(url=f"https://img/{i}", position=i) for i in range(7)]
    db.commit()
    urls = [f"https://img/{i}" for i in range(7)]
    assert client.get(f"/api/listings/{listing.id}").json()["photos"] == urls
    assert client.get("/api/listings").json()["items"][0]["photos"] == urls[:5]
