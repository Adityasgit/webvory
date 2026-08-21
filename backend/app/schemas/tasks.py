from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models import TaskPriority, TaskStatus


class UserBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: str
    avatar_url: str | None = None
    role: str | None = None


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    description: str | None = None
    status: TaskStatus = TaskStatus.pending
    priority: TaskPriority = TaskPriority.medium
    assigned_to: UUID | None = None
    due_date: date | None = None


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    description: str | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    assigned_to: UUID | None = None
    due_date: date | None = None
    clear_assignee: bool = False
    clear_due_date: bool = False


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    description: str | None
    status: TaskStatus
    priority: TaskPriority
    assigned_to: UUID | None
    created_by: UUID
    due_date: date | None
    created_at: datetime
    updated_at: datetime
    is_deleted: bool
    assignee: UserBrief | None = None
    creator: UserBrief | None = None


class TaskListOut(BaseModel):
    items: list[TaskOut]
    total: int
    page: int
    limit: int
    pages: int
