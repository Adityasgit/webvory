import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.deps import get_current_user
from app.models import UserRole
from app.utils.security import create_access_token


@pytest.fixture
def mock_db():
    return MagicMock()


@pytest.fixture
def sample_user_id():
    return uuid.uuid4()


@pytest.fixture
def sample_user(sample_user_id):
    user = MagicMock()
    user.id = sample_user_id
    return user


def test_get_current_user_from_bearer_header(mock_db, sample_user, sample_user_id, monkeypatch):
    token = create_access_token(user_id=sample_user_id, role="member")
    monkeypatch.setattr("app.deps.user_repo.get_by_id", lambda _db, uid: sample_user if uid == sample_user_id else None)

    user = get_current_user(mock_db, authorization=f"Bearer {token}", webvory_token=None)
    assert user is sample_user


def test_get_current_user_from_cookie_fallback(mock_db, sample_user, sample_user_id, monkeypatch):
    token = create_access_token(user_id=sample_user_id, role="member")
    monkeypatch.setattr("app.deps.user_repo.get_by_id", lambda _db, uid: sample_user if uid == sample_user_id else None)

    user = get_current_user(mock_db, authorization=None, webvory_token=token)
    assert user is sample_user


def test_get_current_user_prefers_bearer_over_cookie(mock_db, sample_user, sample_user_id, monkeypatch):
    token = create_access_token(user_id=sample_user_id, role="member")
    monkeypatch.setattr("app.deps.user_repo.get_by_id", lambda _db, uid: sample_user if uid == sample_user_id else None)

    user = get_current_user(
        mock_db,
        authorization=f"Bearer {token}",
        webvory_token="invalid-cookie-token",
    )
    assert user is sample_user


def test_get_current_user_unauthorized(mock_db):
    with pytest.raises(HTTPException) as exc:
        get_current_user(mock_db, authorization=None, webvory_token=None)
    assert exc.value.status_code == 401


def test_logout_returns_json(client):
    res = client.post("/api/auth/logout")
    assert res.status_code == 200
    assert res.json() == {"ok": True}


def test_me_with_bearer_token(client, monkeypatch):
    user_id = uuid.uuid4()
    token = create_access_token(user_id=user_id, role="member")
    user = MagicMock()
    user.id = user_id
    user.name = "Test User"
    user.email = "test@example.com"
    user.avatar_url = None
    user.role = UserRole.member
    user.job_title = None
    user.reporting_manager_id = None
    user.created_at = datetime(2024, 1, 1, tzinfo=timezone.utc)
    user.last_login_at = None

    monkeypatch.setattr("app.deps.user_repo.get_by_id", lambda _db, uid: user if uid == user_id else None)

    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["email"] == "test@example.com"
