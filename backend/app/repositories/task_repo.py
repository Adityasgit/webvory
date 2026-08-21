from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.models import Task


def get_by_id(db: Session, task_id: uuid.UUID) -> Task | None:
    return db.get(Task, task_id)


def list_active(db: Session, *, limit: int = 100) -> list[Task]:
    return (
        db.query(Task)
        .filter(Task.is_deleted.is_(False))
        .order_by(Task.updated_at.desc())
        .limit(limit)
        .all()
    )
