from datetime import date

from app.models import Booking, Listing, ListingPhoto, User
from app.security import hash_password

# bcrypt is slow on purpose, so hash the shared test password once.
_PASSWORD_HASH = hash_password("password123")


def make_user(db, email="u@x.com", name="U", is_host=False) -> User:
    user = User(email=email, name=name, password_hash=_PASSWORD_HASH, is_host=is_host)
    db.add(user)
    db.commit()
    return user


def make_listing(db, host, **overrides) -> Listing:
    fields = dict(
        host_id=host.id, title="Test stay", description="A test listing",
        property_type="flat", place_type="entire_home", address="1 Test Road",
        city="Goa", state="Goa", country="India", latitude=15.5, longitude=73.8,
        price_per_night=4000, cleaning_fee=500, max_guests=4, bedrooms=1, beds=1, bathrooms=1,
        pets_allowed=False, instant_book=True,
    )
    fields.update(overrides)
    listing = Listing(**fields)
    listing.photos = [ListingPhoto(url="https://images.unsplash.com/photo-test?w=1200&q=80",
                                   position=0)]
    db.add(listing)
    db.commit()
    return listing


def make_booking(db, listing, guest, check_in: date, check_out: date, status="confirmed") -> Booking:
    nights = (check_out - check_in).days
    base = nights * listing.price_per_night + listing.cleaning_fee
    service_fee, taxes = round(0.14 * base), round(0.05 * base)
    booking = Booking(
        listing_id=listing.id, guest_id=guest.id, check_in=check_in, check_out=check_out,
        nights=nights, nightly_price=listing.price_per_night, cleaning_fee=listing.cleaning_fee,
        service_fee=service_fee, taxes=taxes, total=base + service_fee + taxes, status=status,
    )
    db.add(booking)
    db.commit()
    return booking
