from datetime import datetime, timedelta, timezone

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
    return bcrypt.checkpw(password.encode(), password_hash.encode())


# --- session cookie (JWT) and auth dependencies ---

COOKIE_NAME = "session"
COOKIE_DAYS = 30


def issue_cookie(response: Response, user_id: int) -> None:
    settings = get_settings()
    exp = datetime.now(timezone.utc) + timedelta(days=COOKIE_DAYS)
    token = jwt.encode({"sub": str(user_id), "exp": exp}, settings.jwt_secret, algorithm="HS256")
    response.set_cookie(
        COOKIE_NAME, token, max_age=COOKIE_DAYS * 86400,
        httponly=True, samesite="lax", secure=settings.cookie_secure,
    )


def optional_user(request: Request, db: Session = Depends(get_db)) -> User | None:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        return None
    try:
        payload = jwt.decode(token, get_settings().jwt_secret, algorithms=["HS256"])
        return db.get(User, int(payload["sub"]))
    except (jwt.InvalidTokenError, KeyError, ValueError):
        return None  # bad or expired token behaves like no token


def current_user(user: User | None = Depends(optional_user)) -> User:
    if user is None:
        raise AppError(401, "not_authenticated", "Please log in.")
    return user
