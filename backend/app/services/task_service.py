from __future__ import annotations

import math
import uuid
from datetime import datetime, timezone

from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.models import ActivityEvent, NotificationType, Task, TaskPriority, TaskStatus, User
from app.schemas.tasks import TaskCreate, TaskUpdate
from app.utils.rbac import ensure_can_delete_task, ensure_can_edit_task


def _notify(
    db: Session,
    *,
    user_id: uuid.UUID | None,
    type: NotificationType,
    title: str,
    body: str | None = None,
    task_id: uuid.UUID | None = None,
) -> None:
    if user_id is None:
        return
    from app.routes.notifications import create_notification

    create_notification(
        db, user_id=user_id, type=type, title=title, body=body, task_id=task_id
    )


def _log(
    db: Session,
    *,
    task_id: uuid.UUID,
    user_id: uuid.UUID | None,
    action: str,
    meta: dict | None = None,
) -> None:
    db.add(
        ActivityEvent(
            task_id=task_id,
            user_id=user_id,
            action=action,
            meta=meta,
        )
    )


def list_tasks(
    db: Session,
    *,
    status: TaskStatus | None = None,
    priority: TaskPriority | None = None,
    assignee: uuid.UUID | None = None,
    search: str | None = None,
    sort: str = "updated_at",
    order: str = "desc",
    page: int = 1,
    limit: int = 20,
) -> tuple[list[Task], int]:
    q = db.query(Task).filter(Task.is_deleted.is_(False))
    if status is not None:
        q = q.filter(Task.status == status)
    if priority is not None:
        q = q.filter(Task.priority == priority)
    if assignee is not None:
        q = q.filter(Task.assigned_to == assignee)
    if search:
        like = f"%{search.strip()}%"
        q = q.filter(or_(Task.title.ilike(like), Task.description.ilike(like)))

    sort_map = {
        "title": Task.title,
        "due_date": Task.due_date,
        "created_at": Task.created_at,
        "updated_at": Task.updated_at,
        "priority": Task.priority,
        "status": Task.status,
    }
    col = sort_map.get(sort, Task.updated_at)
    total = q.count()
    page = max(page, 1)
    limit = min(max(limit, 1), 100)
    items = (
        q.options(joinedload(Task.assignee), joinedload(Task.creator))
        .order_by(col.desc() if order.lower() == "desc" else col.asc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return items, total


def pages_for(total: int, limit: int) -> int:
    return max(1, math.ceil(total / limit)) if total else 0


def get_task(db: Session, task_id: uuid.UUID) -> Task | None:
    return (
        db.query(Task)
        .options(joinedload(Task.assignee), joinedload(Task.creator))
        .filter(Task.id == task_id, Task.is_deleted.is_(False))
        .one_or_none()
    )


def create_task(db: Session, *, actor: User, data: TaskCreate) -> Task:
    task = Task(
        title=data.title.strip(),
        description=data.description,
        status=data.status,
        priority=data.priority,
        assigned_to=data.assigned_to,
        created_by=actor.id,
        due_date=data.due_date,
    )
    db.add(task)
    db.flush()
    _log(
        db,
        task_id=task.id,
        user_id=actor.id,
        action="created",
        meta={"title": task.title},
    )
    if data.assigned_to:
        _log(
            db,
            task_id=task.id,
            user_id=actor.id,
            action="assigned",
            meta={"assigned_to": str(data.assigned_to)},
        )
        _notify(
            db,
            user_id=data.assigned_to,
            type=NotificationType.task_assigned,
            title="Task assigned to you",
            body=task.title,
            task_id=task.id,
        )
    db.commit()
    return get_task(db, task.id)  # type: ignore[return-value]


def update_task(
    db: Session, *, actor: User, task: Task, data: TaskUpdate
) -> Task:
    ensure_can_edit_task(actor, task)
    changes: dict = {}

    if data.title is not None and data.title.strip() != task.title:
        changes["title"] = {"from": task.title, "to": data.title.strip()}
        task.title = data.title.strip()
    if data.description is not None and data.description != task.description:
        changes["description"] = True
        task.description = data.description
    if data.status is not None and data.status != task.status:
        changes["status"] = {"from": task.status.value, "to": data.status.value}
        task.status = data.status
    if data.priority is not None and data.priority != task.priority:
        changes["priority"] = {"from": task.priority.value, "to": data.priority.value}
        task.priority = data.priority

    if data.clear_assignee:
        if task.assigned_to is not None:
            changes["assigned_to"] = {"from": str(task.assigned_to), "to": None}
            task.assigned_to = None
    elif data.assigned_to is not None and data.assigned_to != task.assigned_to:
        changes["assigned_to"] = {
            "from": str(task.assigned_to) if task.assigned_to else None,
            "to": str(data.assigned_to),
        }
        task.assigned_to = data.assigned_to

    if data.clear_due_date:
        if task.due_date is not None:
            changes["due_date"] = {"from": str(task.due_date), "to": None}
            task.due_date = None
    elif data.due_date is not None and data.due_date != task.due_date:
        changes["due_date"] = {
            "from": str(task.due_date) if task.due_date else None,
            "to": str(data.due_date),
        }
        task.due_date = data.due_date

    task.updated_at = datetime.now(timezone.utc)

    if changes:
        action = "status_changed" if "status" in changes and len(changes) == 1 else "updated"
        if "assigned_to" in changes and len(changes) == 1:
            action = "assigned"
        _log(db, task_id=task.id, user_id=actor.id, action=action, meta=changes)
        if "status" in changes:
            _notify(
                db,
                user_id=task.assigned_to,
                type=NotificationType.status_changed,
                title=f"Status → {task.status.value}",
                body=task.title,
                task_id=task.id,
            )
        if "assigned_to" in changes and task.assigned_to:
            _notify(
                db,
                user_id=task.assigned_to,
                type=NotificationType.task_assigned,
                title="Task assigned to you",
                body=task.title,
                task_id=task.id,
            )

    db.commit()
    return get_task(db, task.id)  # type: ignore[return-value]


def soft_delete_task(db: Session, *, actor: User, task: Task) -> None:
    ensure_can_delete_task(actor)
    task.is_deleted = True
    task.updated_at = datetime.now(timezone.utc)
    _log(db, task_id=task.id, user_id=actor.id, action="deleted")
    db.commit()
