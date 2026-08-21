from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.models import AuditLog, User, UserRole
from app.repositories import user_repo


def write_audit(
    db: Session,
    *,
    actor_id: UUID | None,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    meta: dict | None = None,
) -> None:
    db.add(
        AuditLog(
            actor_id=actor_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            meta=meta,
        )
    )


def upsert_google_user(
    db: Session,
    *,
    google_sub: str,
    email: str,
    name: str,
    avatar_url: str | None,
) -> User:
    user = user_repo.get_by_google_sub(db, google_sub)
    if user is None:
        user = user_repo.get_by_email(db, email)

    if user is None:
        role = UserRole.admin if user_repo.count_admins(db) == 0 else UserRole.member
        user = User(
            google_sub=google_sub,
            email=email,
            name=name,
            avatar_url=avatar_url,
            role=role,
        )
        db.add(user)
        db.flush()
        write_audit(
            db,
            actor_id=user.id,
            action="user_created",
            resource_type="user",
            resource_id=str(user.id),
            meta={"email": email, "role": role.value, "via": "google_oauth"},
        )
    else:
        user.google_sub = google_sub
        user.name = name or user.name
        user.email = email
        if avatar_url:
            user.avatar_url = avatar_url

    user.last_login_at = datetime.now(timezone.utc)
    write_audit(
        db,
        actor_id=user.id,
        action="login",
        resource_type="user",
        resource_id=str(user.id),
        meta={"via": "google_oauth"},
    )
    db.commit()
    db.refresh(user)
    return user
