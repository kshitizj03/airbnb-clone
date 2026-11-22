import re
from functools import lru_cache

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings

DEV_JWT_SECRET = "dev-secret-change-me-dev-secret-change-me"


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/airbnb"
    jwt_secret: str = DEV_JWT_SECRET
    cookie_secure: bool = False
    demo_password: str = "demo-password-123"

    @field_validator("database_url")
    @classmethod
    def _use_psycopg(cls, url: str) -> str:
        # Neon and Vercel hand out postgres:// URLs; SQLAlchemy needs the driver named.
        return re.sub(r"^postgres(ql)?://", "postgresql+psycopg://", url)

    @model_validator(mode="after")
    def _real_secret_behind_https(self) -> "Settings":
        # COOKIE_SECURE=true means a real deployment: sessions signed with a public key are forgeable.
        if self.cookie_secure and self.jwt_secret == DEV_JWT_SECRET:
            raise ValueError("Set JWT_SECRET: the dev default is refused when COOKIE_SECURE=true.")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
