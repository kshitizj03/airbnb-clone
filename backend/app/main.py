from contextlib import asynccontextmanager

from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from sqlalchemy.engine import make_url

from app import models  # noqa: F401  (registers tables on Base)
from app.config import get_settings
from app.db import Base, SessionLocal, engine
from app.errors import register_error_handlers
from app.routers import auth, bookings, host, listings, meta, uploads, wishlists
from app.seed import seed


def create_app(init_db: bool = True) -> FastAPI:
    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        if init_db:
            # Build and seed on startup, not at build time: the persistent data folder (e.g. /home on Azure) is only there at runtime.
            db_file = make_url(get_settings().database_url).database
            if db_file:  # the data folder is empty on first boot, so it may not exist yet
                Path(db_file).parent.mkdir(parents=True, exist_ok=True)
            Base.metadata.create_all(engine)
            with SessionLocal() as db:
                seed(db)
        yield

    app = FastAPI(title="Airbnb clone API", lifespan=lifespan)

    register_error_handlers(app)
    app.include_router(auth.router)
    app.include_router(listings.router)
    app.include_router(bookings.router)
    app.include_router(host.router)
    app.include_router(uploads.router)
    app.include_router(wishlists.router)
    app.include_router(meta.router)

    upload_dir = Path(get_settings().upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)  # StaticFiles refuses a missing directory
    app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")

    @app.get("/api/health")
    def health():
        return {"ok": True}

    return app


app = create_app()
