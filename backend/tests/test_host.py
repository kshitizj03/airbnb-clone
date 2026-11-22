from datetime import timedelta

from sqlalchemy import select

from app.clock import today
from app.models import Amenity, Listing, ListingPhoto
from tests.factories import make_booking, make_listing, make_user

PHOTO = "https://images.unsplash.com/photo-new?w=1200"
BLOB = "https://abc123.public.blob.vercel-storage.com/listing-photos/x.jpg"


def _login(client, email):
    r = client.post("/api/auth/login", json={"email": email, "password": "password123"})
    assert r.status_code == 200, r.text


def _error(r, status, code):
    assert r.status_code == status, r.text
    assert r.json()["error"]["code"] == code


def _payload(**extra):
    return dict(
        title="Cosy loft", description="Bright loft near the beach", property_type="flat",
        place_type="entire_home", address="2 Beach Road", city="Goa", state="Goa",
        country="India", latitude=15.5, longitude=73.8, price_per_night=3000, cleaning_fee=400,
        max_guests=3, bedrooms=1, beds=2, bathrooms=1, pets_allowed=True, instant_book=False,
        **{"amenity_slugs": [], "photo_urls": [PHOTO], **extra})


def _host_setup(db, client):
    host = make_user(db, "h@x.com", is_host=True)
    listing = make_listing(db, host)
    _login(client, "h@x.com")
    return host, listing


def test_create_listing_makes_user_host(client, db):
    user = make_user(db, "n@x.com")
    db.add(Amenity(slug="wifi", name="Wifi", category="basics"))
    db.commit()
    _login(client, "n@x.com")
    r = client.post("/api/listings", json=_payload(amenity_slugs=["wifi"]))
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["title"] == "Cosy loft" and body["photos"] == [PHOTO]
    assert [a["slug"] for a in body["amenities"]] == ["wifi"]
    assert body["host"]["id"] == user.id
    assert client.get("/api/auth/me").json()["is_host"] is True
    assert client.get(f"/api/listings/{body['id']}").json()["title"] == "Cosy loft"


def test_create_listing_unknown_amenity_422(client, db):
    make_user(db, "n@x.com")
    _login(client, "n@x.com")
    r = client.post("/api/listings", json=_payload(amenity_slugs=["nope"]))
    _error(r, 422, "unknown_amenity")
    assert "amenity_slugs" in r.json()["error"]["fields"]


def test_create_listing_validates_fields(client, db):
    make_user(db, "n@x.com")
    _login(client, "n@x.com")
    for bad in ({"price_per_night": 0}, {"title": ""}, {"photo_urls": []},
                {"photo_urls": ["javascript:alert(1)"]}, {"max_guests": 17}):
        r = client.post("/api/listings", json={**_payload(), **bad})
        _error(r, 422, "validation_error")


def test_create_listing_requires_login(client):
    _error(client.post("/api/listings", json=_payload()), 401, "not_authenticated")


def test_patch_other_users_listing_403(client, db):
    _, listing = _host_setup(db, client)
    make_user(db, "o@x.com")
    client.post("/api/auth/logout")
    _login(client, "o@x.com")
    _error(client.patch(f"/api/listings/{listing.id}", json={"title": "Mine now"}),
           403, "not_owner")
    _error(client.delete(f"/api/listings/{listing.id}"), 403, "not_owner")


def test_patch_updates_fields_and_amenities(client, db):
    _, listing = _host_setup(db, client)
    db.add(Amenity(slug="wifi", name="Wifi", category="basics"))
    listing.updated_at = listing.updated_at - timedelta(days=1)
    before = listing.updated_at
    db.commit()
    r = client.patch(f"/api/listings/{listing.id}",
                     json={"title": "New title", "price_per_night": 5000, "amenity_slugs": ["wifi"]})
    assert r.status_code == 200, r.text
    body = r.json()
    assert (body["title"], body["price_per_night"]) == ("New title", 5000)
    assert body["description"] == "A test listing"  # untouched
    assert [a["slug"] for a in body["amenities"]] == ["wifi"]
    db.expire_all()
    assert db.get(Listing, listing.id).updated_at > before


def test_patch_replaces_and_reorders_photos(client, db):
    # (listing_id, position) is unique, so replacing and reordering must not collide.
    _, listing = _host_setup(db, client)
    urls = [f"https://images.unsplash.com/photo-{i}?w=1200" for i in range(3)] + [BLOB]
    for wanted in (urls, urls[::-1]):
        r = client.patch(f"/api/listings/{listing.id}", json={"photo_urls": wanted})
        assert r.status_code == 200, r.text
        assert r.json()["photos"] == wanted
        db.expire_all()
        rows = db.scalars(select(ListingPhoto).where(ListingPhoto.listing_id == listing.id)
                          .order_by(ListingPhoto.position)).all()
        assert [(p.position, p.url) for p in rows] == list(enumerate(wanted))


def test_photo_hosts_are_allowlisted(client, db):
    _, listing = _host_setup(db, client)
    for bad in ("http://images.unsplash.com/photo-1", "https://example.com/a.jpg",
                "https://images.unsplash.com.evil.test/a.jpg",
                "https://evil.test/x.public.blob.vercel-storage.com.jpg"):
        r = client.patch(f"/api/listings/{listing.id}", json={"photo_urls": [PHOTO, bad]})
        _error(r, 422, "validation_error")
        assert "photo_urls.1" in r.json()["error"]["fields"]  # the wizard maps this to Photos
    ok = client.patch(f"/api/listings/{listing.id}", json={"photo_urls": [BLOB, PHOTO]})
    assert ok.status_code == 200, ok.text


def test_coordinates_in_range_and_not_nan(client, db):
    _, listing = _host_setup(db, client)
    for bad in ({"latitude": 90.5}, {"latitude": -91}, {"longitude": 180.1},
                {"longitude": -181}):
        _error(client.patch(f"/api/listings/{listing.id}", json=bad), 422, "validation_error")
    # JSON has no NaN, but Python's parser accepts the literal, so send it raw.
    for field in ("latitude", "longitude"):
        r = client.patch(f"/api/listings/{listing.id}", content=f'{{"{field}": NaN}}',
                         headers={"Content-Type": "application/json"})
        _error(r, 422, "validation_error")
    assert client.patch(f"/api/listings/{listing.id}",
                        json={"latitude": -90, "longitude": 180}).status_code == 200


def test_blank_text_and_oversized_numbers_422_not_500(client, db):
    make_user(db, "n@x.com")
    _login(client, "n@x.com")
    for bad in ({"title": "   "}, {"city": " \t "}, {"description": "x" * 501},
                {"address": "x" * 121}, {"cleaning_fee": 10**12}, {"price_per_night": 10**12},
                {"bedrooms": 10**12}, {"beds": 51}, {"max_guests": 10**12}):
        _error(client.post("/api/listings", json={**_payload(), **bad}), 422, "validation_error")
    r = client.post("/api/listings", json={**_payload(), "title": "  Padded  "})
    assert r.status_code == 201 and r.json()["title"] == "Padded"


def test_delete_with_upcoming_booking_409(client, db):
    _, listing = _host_setup(db, client)
    guest = make_user(db, "g@x.com")
    d = today() + timedelta(days=5)
    make_booking(db, listing, guest, d, d + timedelta(days=2))
    _error(client.delete(f"/api/listings/{listing.id}"), 409, "has_upcoming_bookings")


def test_delete_soft_deletes_and_second_call_404(client, db):
    _, listing = _host_setup(db, client)
    guest = make_user(db, "g@x.com")
    d = today() - timedelta(days=9)
    make_booking(db, listing, guest, d, d + timedelta(days=2))  # past stay does not block
    assert client.delete(f"/api/listings/{listing.id}").status_code == 204
    db.expire_all()
    assert db.get(Listing, listing.id).deleted_at is not None
    _error(client.delete(f"/api/listings/{listing.id}"), 404, "listing_not_found")
    _error(client.patch(f"/api/listings/{listing.id}", json={"title": "x"}),
           404, "listing_not_found")


def test_deleted_listing_hidden_from_search_but_in_guest_trips(client, db):
    _, listing = _host_setup(db, client)
    guest = make_user(db, "g@x.com")
    d = today() - timedelta(days=9)
    make_booking(db, listing, guest, d, d + timedelta(days=2))
    assert client.delete(f"/api/listings/{listing.id}").status_code == 204
    assert client.get("/api/listings").json()["total"] == 0
    _error(client.get(f"/api/listings/{listing.id}"), 404, "listing_not_found")
    client.post("/api/auth/logout")
    _login(client, "g@x.com")
    trips = client.get("/api/bookings/me").json()
    assert [t["listing"]["id"] for t in trips] == [listing.id]


def test_quote_rejects_negative_and_oversized_counts(client, db):
    _, listing = _host_setup(db, client)
    d = today() + timedelta(days=5)
    base = f"/api/listings/{listing.id}/quote?check_in={d}&check_out={d + timedelta(days=2)}"
    for param in ("children=-1", "infants=-1", "pets=-1", "adults=0", "adults=17",
                  f"infants={10**12}", "pets=6", f"children={10**20}"):
        _error(client.get(f"{base}&{param}"), 422, "validation_error")


def test_host_listings_with_upcoming_counts(client, db):
    host, listing = _host_setup(db, client)
    newer = make_listing(db, host, title="Newer")
    other = make_listing(db, make_user(db, "o@x.com", is_host=True), title="Not mine")
    gone = make_listing(db, host, title="Gone")
    guest = make_user(db, "g@x.com")
    d = today()
    make_booking(db, listing, guest, d + timedelta(days=3), d + timedelta(days=5))
    make_booking(db, listing, guest, d + timedelta(days=8), d + timedelta(days=9), "cancelled")
    make_booking(db, listing, guest, d - timedelta(days=8), d - timedelta(days=6))
    make_booking(db, other, guest, d + timedelta(days=3), d + timedelta(days=5))
    gone.deleted_at = listing.created_at
    db.commit()
    rows = client.get("/api/host/listings").json()
    assert {r["id"]: r["upcoming_bookings"] for r in rows} == {listing.id: 1, newer.id: 0}
    assert rows[0]["id"] == newer.id  # newest first


def test_host_reservations_filters_by_status(client, db):
    host, listing = _host_setup(db, client)
    second = make_listing(db, host, title="Second")
    other = make_listing(db, make_user(db, "o@x.com", is_host=True), title="Not mine")
    guest = make_user(db, "g@x.com", name="Gina")
    d = today()
    soon = make_booking(db, listing, guest, d + timedelta(days=3), d + timedelta(days=5))
    later = make_booking(db, second, guest, d + timedelta(days=9), d + timedelta(days=10))
    past = make_booking(db, listing, guest, d - timedelta(days=8), d - timedelta(days=6))
    ending_today = make_booking(db, listing, guest, d - timedelta(days=2), d)
    cancelled = make_booking(db, listing, guest, d + timedelta(days=20), d + timedelta(days=21),
                             "cancelled")
    make_booking(db, other, guest, d + timedelta(days=3), d + timedelta(days=5))

    def ids(path):
        r = client.get(path)
        assert r.status_code == 200, r.text
        return [b["id"] for b in r.json()]

    assert ids("/api/host/reservations") == [soon.id, later.id]  # default upcoming, check_in asc
    assert ids("/api/host/reservations?status=past") == [ending_today.id, past.id]
    assert ids("/api/host/reservations?status=cancelled") == [cancelled.id]
    assert ids(f"/api/host/reservations?listing_id={second.id}") == [later.id]
    first = client.get("/api/host/reservations").json()[0]
    assert first["guest"] == {"name": "Gina", "avatar_url": None}
    assert first["listing"]["id"] == listing.id
    _error(client.get(f"/api/host/reservations?listing_id={other.id}"), 404, "listing_not_found")
    _error(client.get("/api/host/reservations?status=bogus"), 422, "validation_error")
