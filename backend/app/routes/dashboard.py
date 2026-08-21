from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.deps import CurrentUser
from app.models import ActivityEvent, Comment, NotificationType, Task, TaskPriority, TaskStatus
from app.schemas.tasks import TaskOut, UserBrief
from app.services import task_service
from app.routes.notifications import create_notification

router = APIRouter(tags=["dashboard", "comments"])


class DashboardStats(BaseModel):
    total: int
    pending: int
    in_progress: int
    completed: int
    blocked: int
    overdue: int
    my_tasks: int
    priority_low: int
    priority_medium: int
    priority_high: int
    priority_urgent: int
    my_tasks_list: list[TaskOut]
    overdue_list: list[TaskOut]


class CommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=5000)


class CommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    task_id: UUID
    user_id: UUID
    body: str
    created_at: object
    user: UserBrief | None = None


class ActivityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    task_id: UUID
    user_id: UUID | None
    action: str
    meta: dict | None
    created_at: object
    user: UserBrief | None = None


@router.get("/api/dashboard", response_model=DashboardStats)
def dashboard(
    db: Annotated[Session, Depends(get_db)],
    user: CurrentUser,
) -> DashboardStats:
    base = db.query(Task).filter(Task.is_deleted.is_(False))
    total = base.count()
    pending = base.filter(Task.status == TaskStatus.pending).count()
    in_progress = base.filter(Task.status == TaskStatus.in_progress).count()
    completed = base.filter(Task.status == TaskStatus.completed).count()
    blocked = base.filter(Task.status == TaskStatus.blocked).count()
    today = date.today()
    overdue_q = base.filter(
        Task.due_date.isnot(None),
        Task.due_date < today,
        Task.status != TaskStatus.completed,
    )
    overdue = overdue_q.count()
    my_q = base.filter(Task.assigned_to == user.id)

    my_tasks_list = (
        my_q.options(joinedload(Task.assignee), joinedload(Task.creator))
        .order_by(Task.updated_at.desc())
        .limit(8)
        .all()
    )
    overdue_list = (
        overdue_q.options(joinedload(Task.assignee), joinedload(Task.creator))
        .order_by(Task.due_date.asc())
        .limit(8)
        .all()
    )

    return DashboardStats(
        total=total,
        pending=pending,
        in_progress=in_progress,
        completed=completed,
        blocked=blocked,
        overdue=overdue,
        my_tasks=my_q.count(),
        priority_low=base.filter(Task.priority == TaskPriority.low).count(),
        priority_medium=base.filter(Task.priority == TaskPriority.medium).count(),
        priority_high=base.filter(Task.priority == TaskPriority.high).count(),
        priority_urgent=base.filter(Task.priority == TaskPriority.urgent).count(),
        my_tasks_list=my_tasks_list,
        overdue_list=overdue_list,
    )


@router.get("/api/tasks/{task_id}/comments", response_model=list[CommentOut])
def list_comments(
    task_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    _user: CurrentUser,
) -> list[Comment]:
    if task_service.get_task(db, task_id) is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return (
        db.query(Comment)
        .options(joinedload(Comment.user))
        .filter(Comment.task_id == task_id)
        .order_by(Comment.created_at.asc())
        .all()
    )


@router.post(
    "/api/tasks/{task_id}/comments",
    response_model=CommentOut,
    status_code=status.HTTP_201_CREATED,
)
def add_comment(
    task_id: UUID,
    body: CommentCreate,
    db: Annotated[Session, Depends(get_db)],
    user: CurrentUser,
) -> Comment:
    task = task_service.get_task(db, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    comment = Comment(task_id=task_id, user_id=user.id, body=body.body.strip())
    db.add(comment)
    db.add(
        ActivityEvent(
            task_id=task_id,
            user_id=user.id,
            action="commented",
            meta={"preview": body.body.strip()[:120]},
        )
    )
    if task.assigned_to and task.assigned_to != user.id:
        create_notification(
            db,
            user_id=task.assigned_to,
            type=NotificationType.comment_added,
            title="New comment on your task",
            body=task.title,
            task_id=task_id,
        )
    db.commit()
    db.refresh(comment)
    comment = (
        db.query(Comment)
        .options(joinedload(Comment.user))
        .filter(Comment.id == comment.id)
        .one()
    )
    return comment


@router.get("/api/tasks/{task_id}/activity", response_model=list[ActivityOut])
def list_activity(
    task_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    _user: CurrentUser,
) -> list[ActivityEvent]:
    if task_service.get_task(db, task_id) is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return (
        db.query(ActivityEvent)
        .options(joinedload(ActivityEvent.user))
        .filter(ActivityEvent.task_id == task_id)
        .order_by(ActivityEvent.created_at.desc())
        .limit(50)
        .all()
    )
