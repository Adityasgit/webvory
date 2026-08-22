import sys
from types import SimpleNamespace

import pytest
from starlette.responses import Response

from app.config import Settings
from app.routes import auth as auth_routes


@pytest.fixture
def prod_cookie_settings(monkeypatch):
    settings = Settings(
        cookie_secure=True,
        cookie_samesite="none",
        cookie_partitioned=True,
        google_redirect_uri="",
    )
    monkeypatch.setattr(auth_routes, "get_settings", lambda: settings)
    return settings


def test_cookie_kwargs_skip_partitioned_on_python_312(prod_cookie_settings, monkeypatch):
    monkeypatch.setattr(auth_routes, "sys", SimpleNamespace(version_info=(3, 12, 0)))
    kwargs = auth_routes._cookie_kwargs()
    assert kwargs["secure"] is True
    assert kwargs["samesite"] == "none"
    assert "partitioned" not in kwargs


def test_cookie_kwargs_native_partitioned_on_python_314(prod_cookie_settings, monkeypatch):
    monkeypatch.setattr(auth_routes, "sys", SimpleNamespace(version_info=(3, 14, 0)))
    kwargs = auth_routes._cookie_kwargs()
    assert kwargs["partitioned"] is True


def test_append_partitioned_on_python_312(prod_cookie_settings, monkeypatch):
    monkeypatch.setattr(auth_routes, "sys", SimpleNamespace(version_info=(3, 12, 0)))
    response = Response()
    auth_routes._set_cookie(response, key="webvory_token", value="jwt", max_age=3600)
    cookie_headers = [
        value.decode("latin-1")
        for name, value in response.raw_headers
        if name.lower() == b"set-cookie"
    ]
    assert len(cookie_headers) == 1
    assert "Partitioned" in cookie_headers[0]
    assert "Secure" in cookie_headers[0]
    assert "SameSite=none" in cookie_headers[0]


def test_oauth_state_cookie_not_partitioned(prod_cookie_settings, monkeypatch):
    monkeypatch.setattr(auth_routes, "sys", SimpleNamespace(version_info=(3, 12, 0)))
    response = Response()
    auth_routes._set_cookie(
        response,
        key=auth_routes.OAUTH_STATE_COOKIE,
        value="signed",
        max_age=600,
        partitioned=False,
    )
    cookie_headers = [
        value.decode("latin-1")
        for name, value in response.raw_headers
        if name.lower() == b"set-cookie"
    ]
    assert len(cookie_headers) == 1
    assert "Partitioned" not in cookie_headers[0]
