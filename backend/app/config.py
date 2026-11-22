import re
from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/airbnb"
    jwt_secret: str = "dev-secret-change-me-dev-secret-change-me"
    cookie_secure: bool = False
    demo_password: str = "demo-password-123"

    @field_validator("database_url")
    @classmethod
    def _use_psycopg(cls, url: str) -> str:
        # Neon and Vercel hand out postgres:// URLs; SQLAlchemy needs the driver named.
        return re.sub(r"^postgres(ql)?://", "postgresql+psycopg://", url)


@lru_cache
def get_settings() -> Settings:
    return Settings()
