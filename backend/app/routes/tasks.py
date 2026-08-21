from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import CurrentUser
from app.models import TaskPriority, TaskStatus
from app.schemas.tasks import TaskCreate, TaskListOut, TaskOut, TaskUpdate
from app.services import task_service

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("", response_model=TaskListOut)
def list_tasks(
    db: Annotated[Session, Depends(get_db)],
    _user: CurrentUser,
    status_filter: Annotated[TaskStatus | None, Query(alias="status")] = None,
    priority: TaskPriority | None = None,
    assignee: UUID | None = None,
    search: str | None = None,
    sort: str = "updated_at",
    order: str = "desc",
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> TaskListOut:
    items, total = task_service.list_tasks(
        db,
        status=status_filter,
        priority=priority,
        assignee=assignee,
        search=search,
        sort=sort,
        order=order,
        page=page,
        limit=limit,
    )
    return TaskListOut(
        items=items,
        total=total,
        page=page,
        limit=limit,
        pages=task_service.pages_for(total, limit),
    )


@router.get("/{task_id}", response_model=TaskOut)
def get_task(
    task_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    _user: CurrentUser,
) -> TaskOut:
    task = task_service.get_task(db, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    body: TaskCreate,
    db: Annotated[Session, Depends(get_db)],
    user: CurrentUser,
) -> TaskOut:
    return task_service.create_task(db, actor=user, data=body)


@router.put("/{task_id}", response_model=TaskOut)
def update_task(
    task_id: UUID,
    body: TaskUpdate,
    db: Annotated[Session, Depends(get_db)],
    user: CurrentUser,
) -> TaskOut:
    task = task_service.get_task(db, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task_service.update_task(db, actor=user, task=task, data=body)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    user: CurrentUser,
) -> None:
    task = task_service.get_task(db, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    task_service.soft_delete_task(db, actor=user, task=task)
