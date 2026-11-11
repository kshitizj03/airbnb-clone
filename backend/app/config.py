from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./app.db"
    upload_dir: str = "./uploads"
    jwt_secret: str = "dev-secret-change-me-dev-secret-change-me"
    cookie_secure: bool = False
    demo_password: str = "demo-password-123"
    # WAL needs shared memory on one host, so use DELETE on network file shares (Azure Files).
    sqlite_journal_mode: Literal["WAL", "DELETE"] = "WAL"
    # How long a transaction waits for the write lock before "database is locked".
    sqlite_busy_timeout_s: float = 15.0


@lru_cache
def get_settings() -> Settings:
    return Settings()
