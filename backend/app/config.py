from functools import lru_cache
from pathlib import Path
from typing import Literal, Self
from urllib.parse import urlparse

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

CookieSameSite = Literal["lax", "strict", "none"]

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
    # When unset, derived in model_post_init: "none" if cookie_secure else "lax".
    # Cross-origin SPA (Vercel) + API (Render) requires SameSite=None + Secure.
    cookie_samesite: CookieSameSite | None = None

    @model_validator(mode="after")
    def normalize_urls_and_redirect(self) -> Self:
        self.backend_url = self.backend_url.rstrip("/")
        self.frontend_url = self.frontend_url.rstrip("/")
        derived = f"{self.backend_url}/api/auth/google/callback"
        explicit = self.google_redirect_uri.strip().rstrip("/")
        if not explicit:
            self.google_redirect_uri = derived
            return self

        explicit_host = urlparse(explicit).netloc.lower()
        frontend_host = urlparse(self.frontend_url).netloc.lower()
        backend_host = urlparse(self.backend_url).netloc.lower()
        # OAuth callback must hit the API host. A common misconfiguration is
        # setting GOOGLE_REDIRECT_URI (or BACKEND_URL) to the SPA host.
        if explicit_host == frontend_host and backend_host and explicit_host != backend_host:
            self.google_redirect_uri = derived
        else:
            self.google_redirect_uri = explicit

        if self.cookie_samesite is None:
            self.cookie_samesite = "none" if self.cookie_secure else "lax"

        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
