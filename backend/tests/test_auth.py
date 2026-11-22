from datetime import UTC, datetime, timedelta

import jwt
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import select

from app.config import DEV_JWT_SECRET, Settings, get_settings
from app.db import get_db
from app.models import User
from tests.factories import make_user

SIGNUP = {"name": "Asha", "email": "Asha@Example.com", "password": "password123"}


def test_signup_sets_cookie_and_me_returns_user(client):
    r = client.post("/api/auth/signup", json=SIGNUP)
    assert r.status_code == 201
    assert r.json()["email"] == "asha@example.com"
    assert "session" in r.cookies
    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["name"] == "Asha"


def test_signup_duplicate_email_409(client):
    client.post("/api/auth/signup", json=SIGNUP)
    r = client.post("/api/auth/signup", json={**SIGNUP, "email": "asha@example.com"})
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "email_taken"


def test_signup_short_password_422(client):
    r = client.post("/api/auth/signup", json={**SIGNUP, "password": "short"})
    assert r.status_code == 422
    err = r.json()["error"]
    assert err["code"] == "validation_error"
    assert "password" in err["fields"]


def test_login_wrong_password_401(client, db):
    make_user(db, email="u@x.com")
    r = client.post("/api/auth/login", json={"email": "u@x.com", "password": "nope-nope"})
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "invalid_credentials"


def test_login_ok_is_case_insensitive(client, db):
    make_user(db, email="u@x.com", name="U")
    r = client.post("/api/auth/login", json={"email": "U@X.com", "password": "password123"})
    assert r.status_code == 200
    assert client.get("/api/auth/me").json()["name"] == "U"


def test_me_without_cookie_401(client):
    r = client.get("/api/auth/me")
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "not_authenticated"


def test_invalid_token_is_treated_as_no_token(client):
    client.cookies.set("session", "garbage")
    assert client.get("/api/auth/me").status_code == 401


def test_logout_clears_session(client):
    client.post("/api/auth/signup", json=SIGNUP)
    assert client.post("/api/auth/logout").status_code == 204
    assert client.get("/api/auth/me").status_code == 401


def test_demo_host_login(client, db):
    make_user(db, email="demo.host@airbnb-clone.test", name="Demo Host", is_host=True)
    r = client.post("/api/auth/demo", json={"role": "host"})
    assert r.status_code == 200
    assert r.json()["is_host"] is True


def test_demo_unavailable_404(client):
    r = client.post("/api/auth/demo", json={"role": "guest"})
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "demo_unavailable"


def test_unknown_route_uses_error_shape(client):
    r = client.get("/api/nope")
    assert r.status_code == 404
    assert "code" in r.json()["error"]


def test_password_is_hashed(client, session_factory):
    client.post("/api/auth/signup", json=SIGNUP)
    with session_factory() as db:
        stored = db.scalar(select(User.password_hash).where(User.email == "asha@example.com"))
    assert stored != "password123"
    assert stored.startswith("$2")


def test_signup_password_over_72_bytes_422(client):
    r = client.post("/api/auth/signup", json={**SIGNUP, "password": "a" * 73})
    assert r.status_code == 422
    assert "password" in r.json()["error"]["fields"]


def test_login_password_over_72_bytes_401(client, db):
    make_user(db, email="u@x.com")
    r = client.post("/api/auth/login", json={"email": "u@x.com", "password": "a" * 100})
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "invalid_credentials"


def test_signup_race_duplicate_is_409(client, monkeypatch):
    client.post("/api/auth/signup", json=SIGNUP)
    # Simulate the race: the pre-check misses, so the unique constraint must catch it.
    monkeypatch.setattr("app.routers.auth._by_email", lambda db, email: None)
    r = client.post("/api/auth/signup", json=SIGNUP)
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "email_taken"


def test_blank_name_422_and_name_is_trimmed(client):
    r = client.post("/api/auth/signup", json={**SIGNUP, "name": "   "})
    assert r.status_code == 422 and "name" in r.json()["error"]["fields"]
    r = client.post("/api/auth/signup", json={**SIGNUP, "name": "  Asha  "})
    assert r.status_code == 201 and r.json()["name"] == "Asha"


def _token(**claims):
    return jwt.encode(claims, get_settings().jwt_secret, algorithm="HS256")


def test_token_without_exp_or_sub_is_rejected(client, db):
    user = make_user(db, email="u@x.com")
    client.cookies.set("session", _token(sub=str(user.id)))  # validly signed, never expires
    assert client.get("/api/auth/me").status_code == 401
    exp = datetime.now(UTC) + timedelta(days=1)
    client.cookies.set("session", _token(exp=exp))
    assert client.get("/api/auth/me").status_code == 401
    client.cookies.set("session", _token(sub=str(user.id), exp=exp))
    assert client.get("/api/auth/me").status_code == 200


def _cleared(r) -> bool:
    cookie = r.headers.get("set-cookie", "")
    return cookie.startswith("session=") and "Max-Age=0" in cookie and "HttpOnly" in cookie


def test_logout_without_or_with_expired_session_is_204_and_clears(client, db):
    r = client.post("/api/auth/logout")
    assert r.status_code == 204 and _cleared(r)
    user = make_user(db, email="u@x.com")
    client.cookies.set("session", _token(sub=str(user.id),
                                         exp=datetime.now(UTC) - timedelta(minutes=1)))
    r = client.post("/api/auth/logout")
    assert r.status_code == 204 and _cleared(r)


def test_dev_jwt_secret_refused_with_secure_cookies():
    with pytest.raises(ValidationError):
        Settings(cookie_secure=True, jwt_secret=DEV_JWT_SECRET)
    assert Settings(cookie_secure=True, jwt_secret="a-real-secret").cookie_secure
    assert not Settings(cookie_secure=False, jwt_secret=DEV_JWT_SECRET).cookie_secure


def test_unexpected_error_is_json_500(client):
    def broken_db():
        raise RuntimeError("database exploded")

    client.app.dependency_overrides[get_db] = broken_db
    with TestClient(client.app, raise_server_exceptions=False) as c:
        r = c.get("/api/amenities")
    assert r.status_code == 500
    assert r.json() == {"error": {"code": "internal_error", "message": "Something went wrong."}}
