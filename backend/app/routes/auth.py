import secrets
from typing import Annotated
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from itsdangerous import BadSignature, URLSafeTimedSerializer
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.deps import CurrentUser
from app.models import User
from app.schemas.auth import UserOut
from app.services.auth_service import upsert_google_user
from app.utils.security import COOKIE_NAME, create_access_token

router = APIRouter(prefix="/api/auth", tags=["auth"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
OAUTH_STATE_COOKIE = "webvory_oauth_state"
OAUTH_STATE_MAX_AGE = 600


def _state_serializer() -> URLSafeTimedSerializer:
    settings = get_settings()
    return URLSafeTimedSerializer(settings.jwt_secret, salt="google-oauth-state")


def _require_google_config() -> None:
    settings = get_settings()
    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and "
                "GOOGLE_CLIENT_SECRET in backend/.env (local) or Render env (production)."
            ),
        )


@router.get("/google")
def google_login(response: Response) -> RedirectResponse:
    _require_google_config()
    settings = get_settings()
    state = secrets.token_urlsafe(32)
    signed_state = _state_serializer().dumps(state)

    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "online",
        "include_granted_scopes": "true",
        "state": state,
        "prompt": "select_account",
    }
    url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    redirect = RedirectResponse(url=url, status_code=status.HTTP_302_FOUND)
    redirect.set_cookie(
        key=OAUTH_STATE_COOKIE,
        value=signed_state,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=OAUTH_STATE_MAX_AGE,
        path="/",
    )
    return redirect


@router.get("/google/callback")
def google_callback(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
) -> RedirectResponse:
    settings = get_settings()
    frontend = settings.frontend_url.rstrip("/")

    if error:
        return RedirectResponse(
            url=f"{frontend}/login?error={error}",
            status_code=status.HTTP_302_FOUND,
        )
    if not code or not state:
        return RedirectResponse(
            url=f"{frontend}/login?error=missing_code",
            status_code=status.HTTP_302_FOUND,
        )

    signed = request.cookies.get(OAUTH_STATE_COOKIE)
    if not signed:
        return RedirectResponse(
            url=f"{frontend}/login?error=missing_state",
            status_code=status.HTTP_302_FOUND,
        )
    try:
        expected = _state_serializer().loads(signed, max_age=OAUTH_STATE_MAX_AGE)
    except BadSignature:
        return RedirectResponse(
            url=f"{frontend}/login?error=invalid_state",
            status_code=status.HTTP_302_FOUND,
        )
    if expected != state:
        return RedirectResponse(
            url=f"{frontend}/login?error=state_mismatch",
            status_code=status.HTTP_302_FOUND,
        )

    _require_google_config()

    try:
        with httpx.Client(timeout=15.0) as client:
            token_res = client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "code": code,
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "redirect_uri": settings.google_redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            token_res.raise_for_status()
            access_token = token_res.json().get("access_token")
            if not access_token:
                raise ValueError("No access_token from Google")

            info_res = client.get(
                GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            info_res.raise_for_status()
            info = info_res.json()
    except (httpx.HTTPError, ValueError):
        return RedirectResponse(
            url=f"{frontend}/login?error=oauth_exchange_failed",
            status_code=status.HTTP_302_FOUND,
        )

    google_sub = info.get("sub")
    email = info.get("email")
    name = info.get("name") or email or "User"
    avatar_url = info.get("picture")
    if not google_sub or not email:
        return RedirectResponse(
            url=f"{frontend}/login?error=incomplete_profile",
            status_code=status.HTTP_302_FOUND,
        )

    user = upsert_google_user(
        db,
        google_sub=google_sub,
        email=email,
        name=name,
        avatar_url=avatar_url,
    )
    jwt_token = create_access_token(user_id=user.id, role=user.role.value)

    redirect = RedirectResponse(
        url=f"{frontend}/dashboard",
        status_code=status.HTTP_302_FOUND,
    )
    redirect.delete_cookie(OAUTH_STATE_COOKIE, path="/")
    redirect.set_cookie(
        key=COOKIE_NAME,
        value=jwt_token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=8 * 60 * 60,
        path="/",
    )
    return redirect


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser) -> User:
    return user


@router.post("/logout")
def logout() -> Response:
    settings = get_settings()
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    response.delete_cookie(
        key=COOKIE_NAME,
        path="/",
        secure=settings.cookie_secure,
        httponly=True,
        samesite="lax",
    )
    return response
