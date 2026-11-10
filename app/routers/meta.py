from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Amenity, Listing
from app.schemas import AmenityOut, DestinationOut

router = APIRouter(prefix="/api", tags=["meta"])


@router.get("/amenities", response_model=list[AmenityOut])
def amenities(db: Session = Depends(get_db)):
    return db.scalars(select(Amenity).order_by(Amenity.category, Amenity.name)).all()


@router.get("/destinations", response_model=list[DestinationOut])
def destinations(q: str = "", db: Session = Depends(get_db)):
    count = func.count().label("listing_count")
    query = (
        select(Listing.city, Listing.state, Listing.country, count)
        .where(Listing.deleted_at.is_(None))
        .group_by(Listing.city, Listing.state, Listing.country)
        .order_by(count.desc(), Listing.city)
        .limit(8)
    )
    if term := q.strip():
        query = query.where(Listing.city.icontains(term, autoescape=True)
                            | Listing.state.icontains(term, autoescape=True)
                            | Listing.country.icontains(term, autoescape=True))
    return [DestinationOut(city=r.city, state=r.state, country=r.country,
                           listing_count=r.listing_count) for r in db.execute(query)]
