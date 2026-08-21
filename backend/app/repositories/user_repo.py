from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.models import User, UserRole


def get_by_id(db: Session, user_id: uuid.UUID) -> User | None:
    return db.get(User, user_id)


def get_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).one_or_none()


def get_by_google_sub(db: Session, google_sub: str) -> User | None:
    return db.query(User).filter(User.google_sub == google_sub).one_or_none()


def list_users(db: Session) -> list[User]:
    return db.query(User).order_by(User.name.asc()).all()


def count_admins(db: Session) -> int:
    return db.query(User).filter(User.role == UserRole.admin).count()
