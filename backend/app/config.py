from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./app.db"
    upload_dir: str = "./uploads"
    jwt_secret: str = "dev-secret-change-me-dev-secret-change-me"
    cookie_secure: bool = False
    demo_password: str = "demo-password-123"


@lru_cache
def get_settings() -> Settings:
    return Settings()
