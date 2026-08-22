from functools import lru_cache
from pathlib import Path
from typing import Self

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql+psycopg://webvory:webvory@localhost:5432/webvory"
    jwt_secret: str = "change-me-in-production"
    google_client_id: str = ""
    google_client_secret: str = ""
    # When unset, derived from backend_url in model_post_init (see below).
    google_redirect_uri: str = ""
    frontend_url: str = "http://localhost:3000"
    backend_url: str = "http://localhost:8000"
    cookie_secure: bool = False

    @model_validator(mode="after")
    def normalize_urls_and_redirect(self) -> Self:
        self.backend_url = self.backend_url.rstrip("/")
        self.frontend_url = self.frontend_url.rstrip("/")
        if not self.google_redirect_uri.strip():
            self.google_redirect_uri = f"{self.backend_url}/api/auth/google/callback"
        else:
            self.google_redirect_uri = self.google_redirect_uri.rstrip("/")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
