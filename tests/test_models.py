import statistics
from datetime import date

import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.clock import today
from app.models import Booking, Listing, Review, User
from app.seed import seed
from tests.factories import make_booking, make_listing, make_user


def test_booking_requires_checkout_after_checkin(db):
    host, guest = make_user(db, "h@x.com"), make_user(db, "g@x.com")
    listing = make_listing(db, host)
    with pytest.raises(IntegrityError):
        make_booking(db, listing, guest, date(2027, 1, 5), date(2027, 1, 5))


def _review(booking):
    return Review(
        booking_id=booking.id, listing_id=booking.listing_id, author_id=booking.guest_id,
        rating=5, cleanliness=5, accuracy=5, checkin=5, communication=5, location=5, value=5,
        comment="Great stay",
    )


def test_review_is_one_per_booking(db):
    host, guest = make_user(db, "h@x.com"), make_user(db, "g@x.com")
    booking = make_booking(db, make_listing(db, host), guest, date(2026, 1, 5), date(2026, 1, 7))
    db.add(_review(booking))
    db.commit()
    db.add(_review(booking))
    with pytest.raises(IntegrityError):
        db.commit()


def test_review_scores_are_1_to_5(db):
    host, guest = make_user(db, "h@x.com"), make_user(db, "g@x.com")
    booking = make_booking(db, make_listing(db, host), guest, date(2026, 1, 5), date(2026, 1, 7))
    review = _review(booking)
    review.value = 6
    db.add(review)
    with pytest.raises(IntegrityError):
        db.commit()


def test_foreign_keys_enforced(db):
    with pytest.raises(IntegrityError):
        make_listing(db, User(id=999, email="ghost@x.com", name="G", password_hash="x"))


def test_listing_checks(db):
    host = make_user(db, "h@x.com")
    with pytest.raises(IntegrityError):
        make_listing(db, host, property_type="castle")


def test_seed_is_deterministic_and_complete(db):
    seed(db)
    assert db.scalar(select(func.count(Listing.id))) >= 78
    assert db.scalar(select(func.count(User.id))) == 10
    assert all(len(listing.photos) == 5 for listing in db.scalars(select(Listing)))
    assert db.scalar(select(func.count(Booking.id)).where(Booking.check_in > today())) >= 15
    unreviewed = (select(func.count(Booking.id)).join(User, User.id == Booking.guest_id)
                  .outerjoin(Review, Review.booking_id == Booking.id)
                  .where(User.email == "demo.guest@airbnb-clone.test", Review.id.is_(None),
                         Booking.check_out <= today()))
    assert db.scalar(unreviewed) == 3  # past stays the demo guest can still review
    seed(db)  # second call is a no-op
    assert db.scalar(select(func.count(User.id))) == 10


def test_seed_ratings_look_like_airbnb(db):
    seed(db)
    scores = ("rating", "cleanliness", "accuracy", "checkin", "communication", "location", "value")
    averages = []
    for listing in db.scalars(select(Listing)):
        reviews = listing.reviews
        assert all(1 <= getattr(r, k) <= 5 for r in reviews for k in scores)
        averages.append((sum(r.rating for r in reviews) / len(reviews), len(reviews)))
    assert min(a for a, _ in averages) >= 4.4
    assert statistics.median(a for a, _ in averages) >= 4.75
    assert sum(1 for a, n in averages if a >= 4.9 and n >= 5) >= 15


def test_health(client):
    assert client.get("/api/health").json() == {"ok": True}
