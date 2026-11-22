from fastapi import FastAPI
from fastapi.responses import RedirectResponse

from app.errors import register_error_handlers
from app.routers import auth, bookings, host, listings, meta, wishlists


def create_app() -> FastAPI:
    # No startup work: the schema and demo data come from `python -m app.seed`, so serverless
    # cold starts never touch the database.
    app = FastAPI(title="Airbnb clone API")

    register_error_handlers(app)
    app.include_router(auth.router)
    app.include_router(listings.router)
    app.include_router(bookings.router)
    app.include_router(host.router)
    app.include_router(wishlists.router)
    app.include_router(meta.router)

    @app.get("/", include_in_schema=False)
    def root():
        return RedirectResponse("/docs")  # the bare API URL opens the interactive docs

    @app.get("/api/health")
    def health():
        return {"ok": True}

    return app


app = create_app()
