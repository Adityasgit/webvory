from app.config import Settings


def test_google_redirect_derived_from_backend_url():
    settings = Settings(
        backend_url="https://webvory.onrender.com",
        frontend_url="https://webvory.vercel.app",
        google_redirect_uri="",
    )
    assert (
        settings.google_redirect_uri
        == "https://webvory.onrender.com/api/auth/google/callback"
    )


def test_google_redirect_corrects_frontend_host_misconfiguration():
    settings = Settings(
        backend_url="https://webvory.onrender.com",
        frontend_url="https://webvory.vercel.app",
        google_redirect_uri="https://webvory.vercel.app/api/auth/google/callback",
    )
    assert (
        settings.google_redirect_uri
        == "https://webvory.onrender.com/api/auth/google/callback"
    )


def test_cookie_samesite_none_when_secure():
    settings = Settings(cookie_secure=True, google_redirect_uri="")
    assert settings.cookie_samesite == "none"


def test_cookie_partitioned_when_secure():
    settings = Settings(cookie_secure=True, google_redirect_uri="")
    assert settings.cookie_partitioned is True


def test_cookie_partitioned_off_when_not_secure():
    settings = Settings(cookie_secure=False, google_redirect_uri="")
    assert settings.cookie_partitioned is False


def test_cookie_samesite_lax_when_not_secure():
    settings = Settings(cookie_secure=False)
    assert settings.cookie_samesite == "lax"


def test_cookie_samesite_explicit_override():
    settings = Settings(cookie_secure=False, cookie_samesite="none")
    assert settings.cookie_samesite == "none"
