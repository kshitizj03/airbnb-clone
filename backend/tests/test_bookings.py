import threading
from datetime import datetime, timedelta

from fastapi.testclient import TestClient

from app import clock
from app.clock import today
from tests.factories import make_booking, make_listing, make_user


def _login(client, email):
    r = client.post("/api/auth/login", json={"email": email, "password": "password123"})
    assert r.status_code == 200, r.text


def _body(listing, start, nights, **extra):
    check_in = today() + timedelta(days=start)
    return {"listing_id": listing.id, "check_in": check_in.isoformat(),
            "check_out": (check_in + timedelta(days=nights)).isoformat(), **extra}


def _setup(db, client, **listing_overrides):
    host, guest = make_user(db, "h@x.com", is_host=True), make_user(db, "g@x.com")
    listing = make_listing(db, host, **listing_overrides)
    _login(client, "g@x.com")
    return host, guest, listing


def _error(r, status, code):
    assert r.status_code == status, r.text
    assert r.json()["error"]["code"] == code


def test_book_creates_booking_with_snapshot(client, db):
    _, _, listing = _setup(db, client)
    r = client.post("/api/bookings", json=_body(listing, 10, 3))
    assert r.status_code == 201, r.text
    b = r.json()
    assert (b["nights"], b["nightly_price"], b["status"]) == (3, 4000, "confirmed")
    assert b["total"] == 12500 + 1750 + 625
    assert b["listing"]["id"] == listing.id


def test_book_back_to_back_allowed(client, db):
    _, guest, listing = _setup(db, client)
    d = today() + timedelta(days=10)
    make_booking(db, listing, guest, d, d + timedelta(days=3))
    after = client.post("/api/bookings", json=_body(listing, 13, 2))  # starts on checkout day
    before = client.post("/api/bookings", json=_body(listing, 8, 2))  # ends on check-in day
    assert after.status_code == 201 and before.status_code == 201


def test_book_overlap_409(client, db):
    _, guest, listing = _setup(db, client)
    d = today() + timedelta(days=10)
    make_booking(db, listing, guest, d, d + timedelta(days=3))
    _error(client.post("/api/bookings", json=_body(listing, 12, 3)), 409, "dates_unavailable")


def test_concurrent_double_booking_only_one_wins(client, db):
    host = make_user(db, "h@x.com", is_host=True)
    make_user(db, "a@x.com")
    make_user(db, "b@x.com")
    listing = make_listing(db, host)
    body = _body(listing, 20, 4)
    barrier, statuses = threading.Barrier(2), []

    def attempt(email):
        with TestClient(client.app) as c:
            _login(c, email)
            barrier.wait()
            statuses.append(c.post("/api/bookings", json=body).status_code)

    threads = [threading.Thread(target=attempt, args=(e,)) for e in ("a@x.com", "b@x.com")]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert sorted(statuses) == [201, 409]


def test_book_today_in_ist_when_utc_is_yesterday(client, db, monkeypatch):
    _, _, listing = _setup(db, client)
    ist_today = today() - timedelta(days=5)  # pinned "IST today", a past date for the real clock
    monkeypatch.setattr(clock, "today", lambda: ist_today)
    body = {"listing_id": listing.id, "check_in": ist_today.isoformat(),
            "check_out": (ist_today + timedelta(days=1)).isoformat()}
    r = client.post("/api/bookings", json=body)
    assert r.status_code == 201, r.text


def test_past_dates_422(client, db):
    _, _, listing = _setup(db, client)
    _error(client.post("/api/bookings", json=_body(listing, -1, 2)), 422, "past_dates")


def test_invalid_and_too_long_stays_422(client, db):
    _, _, listing = _setup(db, client)
    _error(client.post("/api/bookings", json=_body(listing, 5, 0)), 422, "invalid_dates")
    _error(client.post("/api/bookings", json=_body(listing, 5, 366)), 422, "too_long")


def test_too_many_guests_422_infants_not_counted(client, db):
    _, _, listing = _setup(db, client, max_guests=2)
    _error(client.post("/api/bookings", json=_body(listing, 5, 2, adults=2, children=1)),
           422, "too_many_guests")
    _error(client.post("/api/bookings", json=_body(listing, 5, 2, adults=0)), 422, "no_adults")
    ok = client.post("/api/bookings", json=_body(listing, 5, 2, adults=2, infants=3))
    assert ok.status_code == 201, ok.text


def test_pets_not_allowed_422(client, db):
    _, _, listing = _setup(db, client, pets_allowed=False)
    _error(client.post("/api/bookings", json=_body(listing, 5, 2, pets=1)), 422, "pets_not_allowed")


def test_cannot_book_own_listing_403(client, db):
    host = make_user(db, "h@x.com", is_host=True)
    listing = make_listing(db, host)
    _login(client, "h@x.com")
    _error(client.post("/api/bookings", json=_body(listing, 5, 2)), 403, "own_listing")


def test_book_unknown_listing_404_and_login_required(client, db):
    raw = {"listing_id": 99, "check_in": "2030-01-01", "check_out": "2030-01-02"}
    _error(client.post("/api/bookings", json=raw), 401, "not_authenticated")
    make_user(db, "g@x.com")
    _login(client, "g@x.com")
    _error(client.post("/api/bookings", json=raw), 404, "listing_not_found")


def test_booking_snapshots_price_after_host_edit(client, db):
    _, _, listing = _setup(db, client)
    booking = client.post("/api/bookings", json=_body(listing, 10, 2)).json()
    listing.price_per_night = 9000
    db.commit()
    again = client.get(f"/api/bookings/{booking['id']}").json()
    assert again["total"] == booking["total"] and again["nightly_price"] == 4000


def test_cancel_frees_dates(client, db):
    _, _, listing = _setup(db, client)
    body = _body(listing, 10, 3)
    booking = client.post("/api/bookings", json=body).json()
    params = {"check_in": body["check_in"], "check_out": body["check_out"]}
    assert client.get("/api/listings", params=params).json()["total"] == 0
    r = client.post(f"/api/bookings/{booking['id']}/cancel")
    assert r.status_code == 200 and r.json()["status"] == "cancelled"
    assert client.get("/api/listings", params=params).json()["total"] == 1
    _error(client.post(f"/api/bookings/{booking['id']}/cancel"), 409, "already_cancelled")


def test_cancel_rules(client, db):
    _, guest, listing = _setup(db, client)
    started = make_booking(db, listing, guest, today(), today() + timedelta(days=2))
    _error(client.post(f"/api/bookings/{started.id}/cancel"), 409, "already_started")
    upcoming = make_booking(db, listing, guest, today() + timedelta(days=9),
                            today() + timedelta(days=11))
    make_user(db, "o@x.com")
    _login(client, "o@x.com")
    _error(client.post(f"/api/bookings/{upcoming.id}/cancel"), 404, "booking_not_found")
    _error(client.post("/api/bookings/999/cancel"), 404, "booking_not_found")


def test_get_booking_visible_to_guest_and_host_only(client, db):
    _, guest, listing = _setup(db, client)
    b = make_booking(db, listing, guest, today() + timedelta(days=9), today() + timedelta(days=11))
    assert client.get(f"/api/bookings/{b.id}").status_code == 200
    _login(client, "h@x.com")
    assert client.get(f"/api/bookings/{b.id}").status_code == 200
    make_user(db, "o@x.com")
    _login(client, "o@x.com")
    _error(client.get(f"/api/bookings/{b.id}"), 404, "booking_not_found")


def test_my_trips_newest_stay_first_includes_deleted_listing(client, db):
    host, guest, listing = _setup(db, client)
    gone = make_listing(db, host, title="Gone")
    d = today()
    first = make_booking(db, listing, guest, d + timedelta(days=5), d + timedelta(days=6))
    second = make_booking(db, gone, guest, d + timedelta(days=30), d + timedelta(days=32))
    gone.deleted_at = datetime(2026, 1, 1)
    db.commit()
    r = client.get("/api/bookings/me")
    assert r.status_code == 200, r.text
    assert [b["id"] for b in r.json()] == [second.id, first.id]
    assert r.json()[0]["listing"]["title"] == "Gone"


def test_quote_endpoint_returns_409_when_booked(client, db):
    _, guest, listing = _setup(db, client)
    d = today() + timedelta(days=10)
    params = {"check_in": d.isoformat(), "check_out": (d + timedelta(days=2)).isoformat()}
    ok = client.get(f"/api/listings/{listing.id}/quote", params=params)
    assert ok.status_code == 200 and ok.json()["nights"] == 2
    assert ok.json()["total"] == 8000 + 500 + 1190 + 425
    make_booking(db, listing, guest, d, d + timedelta(days=2))
    _error(client.get(f"/api/listings/{listing.id}/quote", params=params), 409, "dates_unavailable")
