from datetime import datetime

from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.cards import rated_listings, to_card
from app.db import get_db
from app.errors import AppError
from app.models import Listing, ListingPhoto, User, Wishlist, WishlistItem
from app.routers.listings import get_live_listing
from app.schemas import SaveIn, WishlistDetail, WishlistIn, WishlistOut
from app.security import current_user

router = APIRouter(prefix="/api/wishlists", tags=["wishlists"])

# The server's func.now() only has 1-second resolution, so "most recent" would tie within a
# second. Timestamps are set from Python (microseconds) and ties are broken by id.
_newest_first = (Wishlist.updated_at.desc(), Wishlist.id.desc())


def _owned(db: Session, wishlist_id: int, user: User) -> Wishlist:
    wishlist = db.get(Wishlist, wishlist_id)
    if wishlist is None or wishlist.user_id != user.id:
        raise AppError(404, "wishlist_not_found", "This wishlist does not exist.")
    return wishlist


def _is_saved(db: Session, wishlist_id: int, listing_id: int) -> bool:
    return db.get(WishlistItem, (wishlist_id, listing_id)) is not None


def _save(db: Session, wishlist: Wishlist, listing_id: int) -> None:
    now = datetime.now()
    wishlist.updated_at = now
    if not _is_saved(db, wishlist.id, listing_id):  # saving twice is a no-op
        db.add(WishlistItem(wishlist_id=wishlist.id, listing_id=listing_id, created_at=now))
    db.flush()


def _outs(db: Session, wishlists: list[Wishlist]) -> list[WishlistOut]:
    """One query for every list's live items, newest first, instead of one per list."""
    rows = db.execute(
        select(WishlistItem.wishlist_id, ListingPhoto.url)
        .join(Listing, Listing.id == WishlistItem.listing_id)
        .outerjoin(ListingPhoto,
                   (ListingPhoto.listing_id == Listing.id) & (ListingPhoto.position == 0))
        .where(WishlistItem.wishlist_id.in_([w.id for w in wishlists]),
               Listing.deleted_at.is_(None))
        .order_by(WishlistItem.created_at.desc(), WishlistItem.listing_id.desc())
    ).all()
    urls: dict[int, list[str | None]] = {w.id: [] for w in wishlists}
    for wishlist_id, url in rows:
        urls[wishlist_id].append(url)
    return [WishlistOut(id=w.id, name=w.name, count=len(urls[w.id]),
                        cover_photos=[u for u in urls[w.id][:4] if u], updated_at=w.updated_at)
            for w in wishlists]


@router.get("", response_model=list[WishlistOut])
def my_wishlists(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return _outs(db, db.scalars(select(Wishlist).where(Wishlist.user_id == user.id)
                                .order_by(*_newest_first)).all())


@router.post("", response_model=WishlistOut, status_code=201)
def create(body: WishlistIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    if body.listing_id is not None:
        get_live_listing(db, body.listing_id)
    wishlist = Wishlist(user_id=user.id, name=body.name, updated_at=datetime.now())
    db.add(wishlist)
    db.flush()
    if body.listing_id is not None:
        _save(db, wishlist, body.listing_id)
    out = _outs(db, [wishlist])[0]
    db.commit()
    return out


# Declared before /{wishlist_id} so "saved" is not parsed as an id.
@router.get("/saved", response_model=dict[int, int])
def saved(db: Session = Depends(get_db), user: User = Depends(current_user)):
    rows = db.execute(
        select(WishlistItem.listing_id, WishlistItem.wishlist_id).join(Wishlist)
        .join(Listing, Listing.id == WishlistItem.listing_id)
        .where(Wishlist.user_id == user.id, Listing.deleted_at.is_(None)).order_by(Wishlist.updated_at, Wishlist.id)
    ).all()
    return dict(rows)  # least recent list first, so the most recently updated list overwrites


@router.get("/{wishlist_id}", response_model=WishlistDetail)
def detail(wishlist_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    wishlist = _owned(db, wishlist_id, user)
    rows = db.execute(
        rated_listings().join(WishlistItem, WishlistItem.listing_id == Listing.id)
        .where(WishlistItem.wishlist_id == wishlist.id)
        .order_by(WishlistItem.created_at.desc(), Listing.id.desc())
    ).all()
    return WishlistDetail(id=wishlist.id, name=wishlist.name,
                          items=[to_card(*row) for row in rows])


@router.delete("/{wishlist_id}", status_code=204)
def delete(wishlist_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    db.delete(_owned(db, wishlist_id, user))
    db.commit()
    return Response(status_code=204)


@router.post("/{wishlist_id}/items", response_model=WishlistOut)
def save_item(wishlist_id: int, body: SaveIn, db: Session = Depends(get_db),
              user: User = Depends(current_user)):
    wishlist = _owned(db, wishlist_id, user)
    get_live_listing(db, body.listing_id)
    try:
        _save(db, wishlist, body.listing_id)
    except IntegrityError:  # a concurrent request saved it first: already saved, so still 200
        db.rollback()
    out = _outs(db, [wishlist])[0]
    db.commit()
    return out


@router.delete("/{wishlist_id}/items/{listing_id}", status_code=204)
def remove_item(wishlist_id: int, listing_id: int, db: Session = Depends(get_db),
                user: User = Depends(current_user)):
    wishlist = _owned(db, wishlist_id, user)
    item = db.get(WishlistItem, (wishlist.id, listing_id))
    if item is None:
        raise AppError(404, "item_not_found", "This listing is not in the wishlist.")
    db.delete(item)
    db.commit()
    return Response(status_code=204)
