from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.models import Comment


def list_for_task(db: Session, task_id: uuid.UUID) -> list[Comment]:
    return (
        db.query(Comment)
        .filter(Comment.task_id == task_id)
        .order_by(Comment.created_at.asc())
        .all()
    )
