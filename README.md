# Airbnb clone

[![CI](https://github.com/kshitizj03/airbnb-clone/actions/workflows/ci.yml/badge.svg)](https://github.com/kshitizj03/airbnb-clone/actions/workflows/ci.yml)

A full-stack stays marketplace built from scratch: search with dates and filters, listing pages with a calendar and a live price quote, bookings that cannot overlap, reviews, wishlists, and a host dashboard with a listing editor. Next.js frontend, FastAPI backend, Postgres database, all on Vercel and Neon.

The UI keeps Airbnb's look and wording on purpose. No Airbnb assets (logo files, images) are copied, and the project is not affiliated with Airbnb.

## Live demo

- App: https://airbnb-clone-kshitiz.vercel.app
- API docs (Swagger): https://airbnb-clone-kshitiz-api.vercel.app/docs (the bare API URL redirects there)

No sign-up needed: the login modal has **Continue as demo guest** and **Continue as demo host** buttons (`demo.guest@airbnb-clone.test` and `demo.host@airbnb-clone.test`). Normal sign-up and login also work.

The database (Neon) scales to zero when idle, so the first request after a quiet period can take a few seconds.

## Try it

1. Search **Goa** with check-in and check-out dates (the cards show the total "for N nights").
2. Open a listing (gallery, calendar, booking card quote, Superhost badge in the host section).
3. Click **Reserve**.
4. Confirm with any test card, e.g. `4242 4242 4242 4242`, any future expiry, any 3-digit CVC.
5. See the confirmation banner, then the booking under **Trips** (you can cancel it there).
6. Still as the demo guest, open **Trips > Past**: three past stays have **Write a review**.
7. Log in as the demo host, click **Switch to hosting**, open **Listings** and create a listing with the **+** button (upload a photo or paste an Unsplash link); it appears in search.
8. Open the user menu (top right) and switch the theme to **Dark**.

## Engineering highlights

- **Double booking is impossible at the database level.** A Postgres exclusion constraint (`ex_booking_overlap`, btree_gist) forbids two confirmed bookings on one listing with overlapping `[check_in, check_out)` ranges, so a checkout day can be the next check-in. The API pre-checks for a friendly 409 `dates_unavailable` and maps a constraint violation (SQLSTATE 23P01) from a lost race to the same 409. A test fires two parallel requests with the pre-check disabled: exactly one gets 201.
- **Prices are computed on the server only.** The quote and booking endpoints share one function; the client never sends a price. Each booking stores a snapshot of the nightly price and every fee, so a later price edit never changes an existing total.
- **First-party session cookie.** The browser only talks to the frontend origin; Next.js rewrites `/api/*` to the API. The HttpOnly, SameSite=Lax session cookie is first-party and no CORS is needed.
- **Uploads checked before they reach storage.** `/upload` forwards the cookie to `/api/auth/me` to check the session, caps files at 4 MB, and requires the file's magic bytes (JPEG, PNG, WebP) to agree with its declared type before storing it in Vercel Blob under a random name.
- **Dark mode without a flash.** An inline script in `<head>` reads the saved choice (or the device setting) and sets the theme before first paint.
- **Derived data is computed, not stored.** Ratings (`AVG`/`COUNT` over reviews), the six category scores and the Superhost badge are computed per request, so they cannot drift.
- **CI on real Postgres.** GitHub Actions lints the backend with ruff, runs its tests against a `postgres:17` service, and lints, type-checks and builds the frontend on every push to `main` and every pull request.
- **Validated at the boundary.** Every request field has bounds (ids, coordinates, prices, guest counts, text length, paging), blank text is rejected, and photo links must be https from Unsplash or the app's Vercel Blob store. Anything unexpected still answers in the shared error shape (500 `internal_error`) and is logged.

## Features

| Area | What exists |
|---|---|
| Search | Location autocomplete, dates, guests, price range, place and property type, bedrooms/beds/bathrooms, amenities, instant book, pets, pagination (18 per page), map with price pins. Search state lives in the URL, so searches are shareable |
| Listing page | Photo gallery and modal, amenities, description, reviews with rating breakdown and sorting, location map, availability calendar with booked dates blocked, booking card with a live price quote, Superhost badge |
| Booking | Server-computed price breakdown, checkout with a validated (mock) card form, confirmation page, Trips list, cancellation of upcoming stays, a star-rated review of each completed stay (overall plus six categories) |
| Wishlists | Heart a listing (creates or picks a wishlist), wishlist pages, remove items, delete lists |
| Hosting | Dashboard with reservations, own listings, create-listing wizard with photo upload (Vercel Blob) or photo links, listing editor, soft delete (refused if upcoming bookings exist) |
| Auth | Email and password sign-up and login, HttpOnly session cookie, demo buttons |
| Dark mode | Light / Dark / System switch at the bottom of the user menu (also when logged out). Follows the device by default; the choice is saved in the browser |
| Responsive | Mobile, tablet and desktop layouts (bottom tab bar and full-screen search on phones) |
| Placeholders | Messages, Experiences, Services, profile and the footer links open a "Coming soon" page; checkout is a mocked card form |

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16.4 (App Router), React 19.3, TypeScript 5, Tailwind CSS 4.3, TanStack Query 5, react-day-picker 10, Leaflet 1.9 + react-leaflet 5 (OpenStreetMap tiles), date-fns 4, @vercel/blob 2.8, sonner, lucide-react |
| Backend | Python 3.12, FastAPI 0.162, SQLAlchemy 2.1 (sync), psycopg 3.3, Pydantic 2.14, PyJWT, bcrypt; uvicorn 0.54 and ruff for local work |
| Database | Postgres (Neon in production, `postgres:17` locally and in CI) |
| Tests | pytest + httpx (backend), node:assert check scripts, ESLint, `tsc` (frontend) |
| Hosting | Vercel (two projects: Next.js app, FastAPI as a Vercel Function), Neon Postgres, Vercel Blob |
| CI | GitHub Actions |

## Architecture

```mermaid
flowchart LR
  B[Browser] --> F["Vercel: Next.js (airbnb-clone)"]
  F -- "rewrite /api/*" --> A["Vercel Function: FastAPI (airbnb-clone-api)"]
  A --> D[("Neon Postgres")]
  F -- "/upload route handler" --> BL[("Vercel Blob")]
```

Key decisions:

- **One origin for the browser.** `next.config.ts` rewrites `/api/*` to `BACKEND_URL`, so cookies are first-party and there is no CORS configuration. `/upload` lives outside `/api` because `/api/*` belongs to FastAPI.
- **Postgres everywhere.** The same database engine runs locally (Docker), in CI (service container) and in production (Neon), so the exclusion constraint is tested where it runs.
- **Schema and seed are a command, not startup work.** `python -m app.seed` creates the btree_gist extension, the tables and the demo data. App startup never touches the database, which keeps serverless cold starts short. No Alembic yet.
- **Functions next to the data.** The API function runs in Singapore (`sin1`), the same region as the Neon database.
- **URL as search state.** Location, dates, guests and filters are query parameters, so any search is a shareable link and Back works as expected.
- **Soft delete for listings.** Bookings and reviews point at listings, so deleted listings must still render in past trips. They vanish from search and detail pages.
- **Sync SQLAlchemy.** Plain sync sessions per request keep the code simple at this scale.

## Database schema

```mermaid
erDiagram
  users ||--o{ listings : hosts
  users ||--o{ bookings : books
  users ||--o{ reviews : writes
  users ||--o{ wishlists : owns
  listings ||--o{ listing_photos : has
  listings ||--o{ listing_amenities : has
  amenities ||--o{ listing_amenities : in
  listings ||--o{ bookings : receives
  listings ||--o{ reviews : receives
  bookings ||--o| reviews : "reviewed by (one per stay)"
  wishlists ||--o{ wishlist_items : contains
  listings ||--o{ wishlist_items : saved_in

  users {
    integer id PK
    varchar email UK
    varchar password_hash
    varchar name
    varchar avatar_url
    text bio
    boolean is_host
    timestamp created_at
  }
  listings {
    integer id PK
    integer host_id FK
    varchar title
    text description
    varchar property_type
    varchar place_type
    varchar address
    varchar city
    varchar state
    varchar country
    float8 latitude
    float8 longitude
    integer price_per_night
    integer cleaning_fee
    integer max_guests
    integer bedrooms
    integer beds
    integer bathrooms
    boolean pets_allowed
    boolean instant_book
    timestamp created_at
    timestamp updated_at
    timestamp deleted_at
  }
  listing_photos {
    integer id PK
    integer listing_id FK
    varchar url
    integer position
  }
  amenities {
    integer id PK
    varchar slug UK
    varchar name
    varchar category
  }
  listing_amenities {
    integer listing_id PK, FK
    integer amenity_id PK, FK
  }
  bookings {
    integer id PK
    integer listing_id FK
    integer guest_id FK
    date check_in
    date check_out
    integer adults
    integer children
    integer infants
    integer pets
    integer nights
    integer nightly_price
    integer cleaning_fee
    integer service_fee
    integer taxes
    integer total
    varchar status
    timestamp created_at
  }
  reviews {
    integer id PK
    integer booking_id UK, FK
    integer listing_id FK
    integer author_id FK
    integer rating
    integer cleanliness
    integer accuracy
    integer checkin
    integer communication
    integer location
    integer value
    text comment
    timestamp created_at
  }
  wishlists {
    integer id PK
    integer user_id FK
    varchar name
    timestamp created_at
    timestamp updated_at
  }
  wishlist_items {
    integer wishlist_id PK, FK
    integer listing_id PK, FK
    timestamp created_at
  }
```

Notes:

- **No overlapping stays:** `bookings` has the exclusion constraint `ex_booking_overlap`: `EXCLUDE USING gist (listing_id WITH =, daterange(check_in, check_out, '[)') WITH &&) WHERE (status = 'confirmed')`. It needs the `btree_gist` extension, which the schema creates before the table.
- Money is stored as whole rupees (`integer`). Dates are plain `date`; "today" for validation is computed in `Asia/Kolkata`.
- Guest vs host is a role per relationship, not an account type: any user can book, and creating a listing sets `is_host` (which shows "Switch to hosting").
- `bookings.status` stores only `confirmed` or `cancelled`; upcoming, current and past are derived from dates.
- `reviews.booking_id` is unique: one review per stay, which also proves the stay.
- CHECK constraints guard positive prices, non-negative cleaning fees, minimum guests/beds/baths, `check_out > check_in`, `adults >= 1`, every rating between 1 and 5, and the allowed `property_type`, `place_type`, `category` and `status` values.
- Indexes on `listings(city)`, `listings(host_id)`, `bookings(listing_id, check_in, check_out)` and `bookings(guest_id)`, plus the GiST index behind the exclusion constraint.

## Pricing

```
nights      = check_out - check_in
subtotal    = nights * price_per_night
service_fee = round(0.14 * (subtotal + cleaning_fee))
taxes       = round(0.05 * (subtotal + cleaning_fee))
total       = subtotal + cleaning_fee + service_fee + taxes
```

Rounding is half up to whole rupees. The rates are mock values (see Assumptions).

## API overview

All routes are under `/api`; interactive docs are at `/docs` on the API URL. Every error, including unexpected ones, shares one shape: `{"error": {"code", "message", "fields?"}}`, with status 401, 403, 404, 409, 422 (`fields` maps each bad field, e.g. `photo_urls.1`, to a message) or 500 (`internal_error`).

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/signup` | - | Create account (name, email, password min 8), sets cookie |
| POST | `/api/auth/login` | - | Log in, sets cookie |
| POST | `/api/auth/demo` | - | Log in as the seeded demo `guest` or `host` |
| POST | `/api/auth/logout` | - | Clear cookie (works with no or an expired session) |
| GET | `/api/auth/me` | - | Current user, or 401 |
| GET | `/api/listings` | - | Search and filter, 18 per page |
| GET | `/api/listings/{id}` | - | Listing detail with rating breakdown and host stats |
| GET | `/api/listings/{id}/availability` | - | Booked ranges for the next 365 days |
| GET | `/api/listings/{id}/reviews` | - | Reviews, 10 per page, `page`, `sort=recent\|highest\|lowest` |
| GET | `/api/listings/{id}/quote` | - | Price breakdown for dates and guests, or an error (409 if booked) |
| POST | `/api/listings` | user | Create a listing (user becomes host) |
| PATCH | `/api/listings/{id}` | owner | Edit a listing |
| DELETE | `/api/listings/{id}` | owner | Soft delete; 409 if upcoming bookings |
| POST | `/api/bookings` | user | Create a booking (not on your own listing) |
| GET | `/api/bookings/me` | user | My trips |
| GET | `/api/bookings/{id}` | guest or host | One booking |
| POST | `/api/bookings/{id}/cancel` | guest | Cancel a booking before check-in day |
| POST | `/api/bookings/{id}/review` | guest | Review a completed stay (overall and six category ratings, comment), once |
| GET | `/api/host/listings` | user | Own listings with upcoming booking counts |
| GET | `/api/host/reservations` | user | Bookings on own listings, `status=upcoming\|past\|cancelled`, optional `listing_id` |
| GET | `/api/wishlists` | user | My wishlists with cover and count |
| POST | `/api/wishlists` | user | Create a wishlist, optionally saving a listing |
| GET | `/api/wishlists/saved` | user | Map of saved `listing_id` to `wishlist_id` (for hearts) |
| GET | `/api/wishlists/{id}` | owner | Wishlist with listing cards |
| DELETE | `/api/wishlists/{id}` | owner | Delete a wishlist |
| POST | `/api/wishlists/{id}/items` | owner | Save a listing |
| DELETE | `/api/wishlists/{id}/items/{listing_id}` | owner | Remove a listing |
| GET | `/api/amenities` | - | All amenities |
| GET | `/api/destinations` | - | Up to 8 matching cities with listing counts (`q`) |
| GET | `/api/health` | - | `{"ok": true}` |

Search parameters for `GET /api/listings`: `location`, `check_in` + `check_out` (both or neither; excludes listings with an overlapping confirmed booking), `guests`, `min_price`, `max_price`, `place_type`, `property_types`, `amenities` (comma-separated slugs, all required), `bedrooms`, `beds`, `bathrooms` (minimums), `instant_book`, `pets`, `page`.

Photo uploads are not part of the API: the frontend's `POST /upload` (multipart field `file`) returns `{url}` with 201, or 401, 413, 415, 422, or 503 `uploads_unavailable` when no Blob token is configured.

## Local setup

Prerequisites: Docker, Python 3.12 and Node.js 22.

### Database

```bash
docker run -d --name airbnb-clone-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=airbnb -p 5432:5432 postgres:17
docker exec airbnb-clone-pg createdb -U postgres airbnb_test   # for the tests
```

This matches the backend's default `DATABASE_URL` (`postgresql+psycopg://postgres:postgres@localhost:5432/airbnb`). If port 5432 is taken, map any free port (e.g. `-p 55432:5432`) and set `DATABASE_URL` and `TEST_DATABASE_URL` to match.

### Backend

macOS / Linux:

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
python -m app.seed
python -m uvicorn app.main:app --reload --port 8000
```

Windows (PowerShell):

```powershell
cd backend
py -3.12 -m venv .venv
.venv\Scripts\activate
pip install -r requirements-dev.txt
python -m app.seed
python -m uvicorn app.main:app --reload --port 8000
```

`python -m app.seed` creates the btree_gist extension and the tables, then seeds an empty database: 10 users (6 hosts, 4 guests, including the two demo accounts), 78 listings in 13 cities (Goa, Jaipur, Udaipur, Manali, Rishikesh, Mumbai, Bengaluru, Kochi, Pondicherry, Coorg, Shimla, Dubai, Bali), 29 amenities, 825 bookings and 802 reviews. Past stays are reviewed except the demo guest's three latest, so writing a review can be tried; 20 future bookings block dates. The seed is deterministic (`random.Random(42)`) with dates relative to today. It does nothing if users already exist; `python -m app.seed --reset` drops every table and rebuilds.

The API is at http://127.0.0.1:8000 (`/` redirects to `/docs`).

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local      # PowerShell: Copy-Item .env.example .env.local
npm run dev
```

`.env.example` sets `BACKEND_URL=http://127.0.0.1:8000` (also the fallback when unset). Open http://localhost:3000.

Photo uploads need `BLOB_READ_WRITE_TOKEN`. With access to the Vercel project, `vercel env pull` writes it into `.env.local` (keep `BACKEND_URL` pointing at the local API). Without it, `/upload` returns 503 `uploads_unavailable` and hosts can paste Unsplash photo links instead.

### Environment variables

Backend (read from the process environment):

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql+psycopg://postgres:postgres@localhost:5432/airbnb` | Postgres connection. `postgres://` and `postgresql://` URLs (as Neon issues them) are rewritten to use psycopg |
| `JWT_SECRET` | dev value | Session signing key. Set a real one in production: the API refuses to start with the dev value when `COOKIE_SECURE=true` |
| `COOKIE_SECURE` | `false` | Set `true` behind HTTPS |
| `DEMO_PASSWORD` | dev value | Password the seed gives every seeded account (the demo buttons need none). Set one in production, where the nightly reset reads it from a repo secret |
| `TEST_DATABASE_URL` | `postgresql+psycopg://postgres:postgres@localhost:5432/airbnb_test` | Tests only |

Frontend:

| Variable | Default | Purpose |
|---|---|---|
| `BACKEND_URL` | `http://127.0.0.1:8000` | Where `/api/*` is rewritten to, and where `/upload` checks the session |
| `BLOB_READ_WRITE_TOKEN` | unset | Vercel Blob token for photo uploads |

## Tests

Backend (needs the Postgres container):

```bash
cd backend
ruff check .                    # lint, with the venv active
python -m pytest
```

The suite recreates the schema in `TEST_DATABASE_URL` at the start and truncates every table after each test, so point it at a throwaway database. 101 tests cover pricing, search filters, input validation, auth, bookings, reviews, host tools, wishlists and the seed. The ones that matter most: two concurrent bookings for the same nights (the constraint lets exactly one through), back-to-back stays, IST "today", price snapshots and ownership checks.

Frontend:

```bash
cd frontend
npx eslint .
npx tsc --noEmit
npm run check:dates     # calendar rules
npm run check:images    # upload type sniffing
npm run build
```

The check scripts import TypeScript directly, which needs Node 22.18 or newer. CI (`.github/workflows/ci.yml`) runs all of the above, plus `ruff check .` and the backend tests, on every push to `main` and every pull request.

`package.json` has an `overrides` entry: `@vercel/blob` pulls in `@vercel/cli-config`, which pins zod 4.1.11, affected by GHSA-mrhx-c7xc-m3w5; the override lifts it to the fixed 4.6.7. Drop it once `@vercel/cli-config` moves past that version (`npm ls zod`, `npm audit --omit=dev`).

## Deployment

- **Two Vercel projects from one repo.** `airbnb-clone` has root directory `frontend` (Next.js). `airbnb-clone-api` has root directory `backend`; Vercel detects the FastAPI `app` in `app/main.py` and runs it as a Python 3.12 function (`backend/.python-version`). Both deploy from `main`.
- **Region.** Functions run in Singapore (`sin1`), next to the database.
- **Database.** Neon Postgres (free plan, `ap-southeast-1` Singapore), provisioned through the Vercel Marketplace, which injects `DATABASE_URL` into the API project. The schema and demo data come from `python -m app.seed` run against that URL.
- **Nightly demo reset.** `.github/workflows/reset-demo.yml` runs `python -m app.seed --reset` against Neon every night at 03:00 IST (and on demand from the Actions tab), so visitors' test bookings and listings do not pile up. It needs two repo secrets: `NEON_DATABASE_URL` (Neon's unpooled connection string) and `DEMO_PASSWORD`; the first step fails with a clear message when they are missing.
- **Photos.** A public Vercel Blob store connected to the frontend project provides `BLOB_READ_WRITE_TOKEN`.
- **Environment.** Frontend: `BACKEND_URL` (the API project's URL). API: `DATABASE_URL`, `JWT_SECRET`, `COOKIE_SECURE=true`.
- **Build skipping.** Each project's Ignored Build Step is `git diff --quiet HEAD^ HEAD -- .`, so a push only rebuilds the project whose folder changed.

## Assumptions and limits

- Payments are mocked: the card form is validated but never sent anywhere. Service fee (14%) and taxes (5%) are mock rates, and prices are in INR.
- Messaging, Experiences, Services and profile pages are out of scope and show "Coming soon". Identity verification is left out, and the flexible dates tab is disabled.
- A host is a Superhost when the average rating across their live listings is at least 4.8 and those listings have at least 10 completed stays (confirmed, checked out by today).
- A user becomes a host by creating a listing; there is no separate host sign-up.
- A booking is confirmed immediately (no host approval step), and only stays that have not started can be cancelled.
- Check-in must be within the next 365 days (the window the availability calendar shows), and a stay is at most 365 nights. Without that limit, a booking in a far-future year would stay "upcoming" forever and stop the host from ever deleting the listing.
- Photos are Unsplash URLs or uploads to the app's Vercel Blob store: the API (and the wizard) only accept https links from `images.unsplash.com` or `*.public.blob.vercel-storage.com`. Vercel functions accept request bodies up to about 4.5 MB, so uploads are capped at 4 MB. The map uses OpenStreetMap tiles.
- "Today" is computed in Asia/Kolkata for date validation, by the API and by the calendars and trip tabs in the browser.
- No migrations: `python -m app.seed` only creates missing tables, so a change to an existing table needs `--reset` (which deletes all data).
- Seed data is fictional and deterministic. The live demo is reset to it every night, so anything created there is temporary.

## Project structure

```
.github/workflows/ci.yml          ruff and backend tests on Postgres, frontend checks and build
.github/workflows/reset-demo.yml  nightly reset of the live demo data
backend/
  app/            FastAPI app: main.py, routers/, models.py, pricing.py, availability.py, seed.py
  tests/          pytest suite
frontend/
  src/app/        Next.js routes (search, rooms, book, trips, wishlists, hosting, become-a-host)
                  and upload/route.ts (photo uploads to Vercel Blob)
  src/components/ UI components
  src/hooks/      data hooks (TanStack Query)
  src/lib/        API client and helpers
```
