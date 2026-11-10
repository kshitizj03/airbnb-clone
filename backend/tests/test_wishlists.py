from datetime import datetime

from sqlalchemy import func, select

from app.models import WishlistItem
from tests.factories import make_listing, make_user


def _setup(db, client, n=2):
    host = make_user(db, "h@x.com", is_host=True)
    listings = [make_listing(db, host, title=f"Stay {i}") for i in range(n)]
    make_user(db, "g@x.com")
    r = client.post("/api/auth/login", json={"email": "g@x.com", "password": "password123"})
    assert r.status_code == 200, r.text
    return listings


def _error(r, status, code):
    assert r.status_code == status, r.text
    assert r.json()["error"]["code"] == code


def test_create_wishlist_with_first_listing(client, db):
    a, _ = _setup(db, client)
    r = client.post("/api/wishlists", json={"name": "  Goa 2026  ", "listing_id": a.id})
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["name"] == "Goa 2026" and body["count"] == 1 and len(body["cover_photos"]) == 1
    assert [c["id"] for c in client.get(f"/api/wishlists/{body['id']}").json()["items"]] == [a.id]


def test_create_with_unknown_listing_404(client, db):
    _setup(db, client)
    _error(client.post("/api/wishlists", json={"name": "X", "listing_id": 999}),
           404, "listing_not_found")
    assert client.get("/api/wishlists").json() == []


def test_saved_map_points_to_list(client, db):
    a, b = _setup(db, client)
    w = client.post("/api/wishlists", json={"name": "One", "listing_id": a.id}).json()
    assert client.get("/api/wishlists/saved").json() == {str(a.id): w["id"]}
    client.post(f"/api/wishlists/{w['id']}/items", json={"listing_id": b.id})
    assert client.get("/api/wishlists/saved").json() == {str(a.id): w["id"], str(b.id): w["id"]}


def test_saved_map_most_recently_updated_list_wins(client, db):
    a, _ = _setup(db, client)
    old = client.post("/api/wishlists", json={"name": "Old", "listing_id": a.id}).json()
    new = client.post("/api/wishlists", json={"name": "New", "listing_id": a.id}).json()
    assert client.get("/api/wishlists/saved").json() == {str(a.id): new["id"]}
    client.post(f"/api/wishlists/{old['id']}/items", json={"listing_id": a.id})
    assert client.get("/api/wishlists/saved").json() == {str(a.id): old["id"]}


def test_save_into_existing_list_moves_it_to_top(client, db):
    a, b = _setup(db, client)
    first = client.post("/api/wishlists", json={"name": "First", "listing_id": a.id}).json()
    second = client.post("/api/wishlists", json={"name": "Second"}).json()
    assert [w["id"] for w in client.get("/api/wishlists").json()] == [second["id"], first["id"]]
    client.post(f"/api/wishlists/{first['id']}/items", json={"listing_id": b.id})
    assert [w["id"] for w in client.get("/api/wishlists").json()] == [first["id"], second["id"]]
    assert client.get("/api/wishlists/saved").json()[str(b.id)] == first["id"]


def test_remove_item(client, db):
    a, _ = _setup(db, client)
    w = client.post("/api/wishlists", json={"name": "L", "listing_id": a.id}).json()
    assert client.delete(f"/api/wishlists/{w['id']}/items/{a.id}").status_code == 204
    assert client.get(f"/api/wishlists/{w['id']}").json()["items"] == []
    _error(client.delete(f"/api/wishlists/{w['id']}/items/{a.id}"), 404, "item_not_found")


def test_other_users_wishlist_404(client, db):
    a, _ = _setup(db, client)
    w = client.post("/api/wishlists", json={"name": "Mine", "listing_id": a.id}).json()
    make_user(db, "o@x.com")
    client.post("/api/auth/login", json={"email": "o@x.com", "password": "password123"})
    assert client.get("/api/wishlists").json() == []
    base = f"/api/wishlists/{w['id']}"
    for r in (client.get(base), client.delete(base),
              client.post(f"{base}/items", json={"listing_id": a.id}),
              client.delete(f"{base}/items/{a.id}"), client.get("/api/wishlists/999")):
        _error(r, 404, "wishlist_not_found")


def test_save_twice_no_duplicate(client, db):
    a, _ = _setup(db, client)
    w = client.post("/api/wishlists", json={"name": "L", "listing_id": a.id}).json()
    r = client.post(f"/api/wishlists/{w['id']}/items", json={"listing_id": a.id})
    assert r.status_code == 200 and r.json()["count"] == 1
    assert db.scalar(select(func.count()).select_from(WishlistItem)) == 1


def test_name_over_50_chars_422(client, db):
    _setup(db, client)
    assert client.post("/api/wishlists", json={"name": "x" * 51}).status_code == 422
    assert client.post("/api/wishlists", json={"name": "   "}).status_code == 422


def test_deleted_listing_hidden_and_cannot_be_saved(client, db):
    a, b = _setup(db, client)
    w = client.post("/api/wishlists", json={"name": "L", "listing_id": a.id}).json()
    client.post(f"/api/wishlists/{w['id']}/items", json={"listing_id": b.id})
    b.deleted_at = datetime.now()
    db.commit()
    items = client.get(f"/api/wishlists/{w['id']}").json()["items"]
    assert [c["id"] for c in items] == [a.id]
    assert client.get("/api/wishlists").json()[0]["count"] == 1
    _error(client.post(f"/api/wishlists/{w['id']}/items", json={"listing_id": b.id}),
           404, "listing_not_found")


def test_delete_wishlist_and_requires_login(client, db):
    a, _ = _setup(db, client)
    w = client.post("/api/wishlists", json={"name": "L", "listing_id": a.id}).json()
    assert client.delete(f"/api/wishlists/{w['id']}").status_code == 204
    assert client.get("/api/wishlists").json() == []
    client.post("/api/auth/logout")
    assert client.get("/api/wishlists").status_code == 401
