from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db import get_db
from app.errors import AppError
from app.models import User
from app.schemas import DemoIn, LoginIn, SignupIn, UserOut
from app.security import current_user, hash_password, issue_cookie, optional_user, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email.strip().lower()))


@router.post("/signup", status_code=201, response_model=UserOut)
def signup(body: SignupIn, response: Response, db: Session = Depends(get_db)):
    if _by_email(db, body.email):
        raise AppError(409, "email_taken", "An account with this email already exists.")
    user = User(name=body.name.strip(), email=body.email.strip().lower(),
                password_hash=hash_password(body.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:  # a concurrent signup took the email after our check
        db.rollback()
        raise AppError(409, "email_taken", "An account with this email already exists.")
    issue_cookie(response, user.id)
    return user


@router.post("/login", response_model=UserOut)
def login(body: LoginIn, response: Response, db: Session = Depends(get_db)):
    user = _by_email(db, body.email)
    if not user or not verify_password(body.password, user.password_hash):
        raise AppError(401, "invalid_credentials", "Incorrect email or password.")
    issue_cookie(response, user.id)
    return user


@router.post("/demo", response_model=UserOut)
def demo(body: DemoIn, response: Response, db: Session = Depends(get_db)):
    user = _by_email(db, f"demo.{body.role}@airbnb-clone.test")
    if not user:
        raise AppError(404, "demo_unavailable", "Demo accounts are not set up.")
    issue_cookie(response, user.id)
    return user


@router.post("/logout", status_code=204)
def logout(response: Response, _user: User = Depends(current_user)):
    response.delete_cookie("session")


@router.get("/me", response_model=UserOut)
def me(user: User | None = Depends(optional_user)):
    if user is None:
        raise AppError(401, "not_authenticated", "Please log in.")
    return user
