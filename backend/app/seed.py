"""Demo data. `seed(db)` is a no-op if any user exists; `python -m app.seed --reset` rebuilds."""
import random
import sys
from datetime import datetime, time, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.clock import today
from app.config import get_settings
from app.db import Base, SessionLocal, engine
from app.models import Amenity, Booking, Listing, ListingPhoto, Review, User
from app.pricing import quote
from app.security import hash_password
from app.seed_data import (
    AMENITIES, CITIES, DESCRIPTIONS, GUESTS, HOSTS, PHOTOS, REVIEW_COMMENTS,
)

N_FUTURE_BOOKINGS = 20


def _booking(listing: Listing, guest: User, check_in, nights: int, rng: random.Random) -> Booking:
    check_out = check_in + timedelta(days=nights)
    q = quote(listing.price_per_night, listing.cleaning_fee, check_in, check_out)
    adults = rng.randint(1, max(1, listing.max_guests - 1))
    return Booking(
        listing=listing, guest=guest, check_in=check_in,
        check_out=check_out, adults=adults, nights=nights,
        nightly_price=listing.price_per_night, cleaning_fee=listing.cleaning_fee,
        service_fee=q.service_fee, taxes=q.taxes, total=q.total,
        status="confirmed",
    )


def _review(booking: Booking, p_five: float, rng: random.Random) -> Review:
    # Airbnb-like: mostly 5s, some 4s, rare 3s. p_five is the listing's quality.
    rating = 5 if rng.random() < p_five else (3 if rng.random() < 0.06 else 4)

    def score() -> int:
        return min(5, max(1, rating + rng.choice([-1, 0, 0, 0, 0, 0, 1])))

    scores = {k: score() for k in
              ("cleanliness", "accuracy", "checkin", "communication", "location", "value")}
    return Review(
        booking=booking, listing=booking.listing, author=booking.guest,
        rating=rating, **scores,
        comment=rng.choice(REVIEW_COMMENTS[rating]),
        created_at=datetime.combine(booking.check_out, time(10, 0)),
    )


def seed(db: Session) -> None:
    if db.scalar(select(func.count(User.id))) > 0:
        return
    rng = random.Random(42)
    now = today()
    password_hash = hash_password(get_settings().demo_password)  # one hash, bcrypt is slow

    hosts = [User(email=e, name=n, password_hash=password_hash, is_host=True,
                  bio="Local host who loves sharing the best of the city.") for n, e in HOSTS]
    guests = [User(email=e, name=n, password_hash=password_hash) for n, e in GUESTS]
    amenities = [Amenity(slug=s, name=n, category=c) for s, n, c in AMENITIES]
    db.add_all(hosts + guests + amenities)

    listings = []
    for city, (state, country, lat, lng, low, high, localities, titles) in CITIES.items():
        for i, (title, property_type, place_type) in enumerate(titles):
            entire = place_type == "entire_home"
            listing = Listing(
                host=hosts[len(listings) % len(hosts)], title=title,
                description=rng.choice(DESCRIPTIONS), property_type=property_type,
                place_type=place_type,
                address=f"{rng.randint(1, 120)}, {localities[i]}",
                city=city, state=state, country=country,
                latitude=round(lat + rng.uniform(-0.05, 0.05), 5),
                longitude=round(lng + rng.uniform(-0.05, 0.05), 5),
                price_per_night=round(rng.randint(low, high), -2),
                cleaning_fee=rng.choice([0, 300, 500, 800, 1000]),
                max_guests=rng.randint(4, 8) if entire else rng.randint(1, 3),
                bedrooms=rng.randint(1, 4) if entire else 1,
                pets_allowed=rng.random() < 0.3, instant_book=rng.random() < 0.7,
            )
            listing.beds = max(1, listing.bedrooms) + rng.randint(0, 1)
            listing.bathrooms = rng.randint(1, max(1, listing.bedrooms))
            listing.photos = [ListingPhoto(url=u, position=p)
                              for p, u in enumerate(rng.sample(PHOTOS, 5))]
            listing.amenities = rng.sample(amenities, rng.randint(8, 18))
            listings.append(listing)
    db.add_all(listings)

    # Past stays walk backwards from today with gaps, so a listing's stays never overlap.
    for listing in listings:
        end = now - timedelta(days=rng.randint(3, 20))
        p_five = rng.choices([0.98, 0.85, 0.65], weights=[45, 40, 15])[0]  # listing quality tier
        for _ in range(rng.randint(5, 15)):
            nights = rng.randint(2, 5)
            booking = _booking(listing, rng.choice(guests), end - timedelta(days=nights), nights, rng)
            db.add(booking)
            db.add(_review(booking, p_five, rng))
            end -= timedelta(days=nights + rng.randint(2, 15))

    # Future stays on distinct listings (one each), so they cannot overlap either.
    for listing in rng.sample(listings, N_FUTURE_BOOKINGS):
        start = now + timedelta(days=rng.randint(7, 150))
        db.add(_booking(listing, rng.choice(guests), start, rng.randint(2, 6), rng))
    db.commit()


if __name__ == "__main__":
    if "--reset" in sys.argv:
        Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as session:
        seed(session)
        for model in (User, Listing, ListingPhoto, Amenity, Booking, Review):
            print(f"{model.__tablename__}: {session.scalar(select(func.count()).select_from(model))}")
