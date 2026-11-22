from datetime import UTC, datetime, timedelta

import bcrypt
import jwt
from fastapi import Depends, Request, Response
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.errors import AppError
from app.models import User


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    encoded = password.encode()
    if len(encoded) > 72:  # bcrypt raises on longer input; such a password can never match
        return False
    return bcrypt.checkpw(encoded, password_hash.encode())


# --- session cookie (JWT) and auth dependencies ---

COOKIE_NAME = "session"
COOKIE_DAYS = 30


def _cookie_flags() -> dict:
    """Set and delete use the same flags, or the browser keeps the old cookie."""
    return {"httponly": True, "samesite": "lax", "secure": get_settings().cookie_secure}


def issue_cookie(response: Response, user_id: int) -> None:
    exp = datetime.now(UTC) + timedelta(days=COOKIE_DAYS)
    token = jwt.encode({"sub": str(user_id), "exp": exp}, get_settings().jwt_secret,
                       algorithm="HS256")
    response.set_cookie(COOKIE_NAME, token, max_age=COOKIE_DAYS * 86400, **_cookie_flags())


def clear_cookie(response: Response) -> None:
    response.delete_cookie(COOKIE_NAME, **_cookie_flags())


def optional_user(request: Request, db: Session = Depends(get_db)) -> User | None:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        return None
    try:
        payload = jwt.decode(token, get_settings().jwt_secret, algorithms=["HS256"],
                             options={"require": ["exp", "sub"]})
        return db.get(User, int(payload["sub"]))
    except (jwt.InvalidTokenError, ValueError):
        return None  # bad, expired or incomplete token behaves like no token


def current_user(user: User | None = Depends(optional_user)) -> User:
    if user is None:
        raise AppError(401, "not_authenticated", "Please log in.")
    return user
