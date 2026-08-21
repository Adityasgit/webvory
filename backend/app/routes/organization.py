from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.deps import CurrentUser
from app.models import Task, TaskStatus, User, UserRole
from app.schemas.auth import UserOut
from app.schemas.tasks import TaskOut
from app.services.auth_service import write_audit
from app.utils.tree import would_create_cycle

router = APIRouter(tags=["organization", "users"])


class ManagerPatch(BaseModel):
    manager_id: UUID | None = None


class OrgUserNode(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: str
    avatar_url: str | None
    role: UserRole
    job_title: str | None
    reporting_manager_id: UUID | None
    children: list["OrgUserNode"] = []
    tasks: list[TaskOut] = []


class OrgTreeOut(BaseModel):
    roots: list[OrgUserNode]
    unassigned_tasks: list[TaskOut]


class UserOrgOut(UserOut):
    manager_name: str | None = None
    direct_reports_count: int = 0
    open_tasks_count: int = 0


def _reporting_map(db: Session) -> dict[UUID, UUID | None]:
    rows = db.query(User.id, User.reporting_manager_id).all()
    return {r.id: r.reporting_manager_id for r in rows}


def _open_task_counts(db: Session) -> dict[UUID, int]:
    rows = (
        db.query(Task.assigned_to, func.count(Task.id))
        .filter(
            Task.is_deleted.is_(False),
            Task.assigned_to.isnot(None),
            Task.status != TaskStatus.completed,
        )
        .group_by(Task.assigned_to)
        .all()
    )
    return {uid: count for uid, count in rows if uid}


def _report_counts(db: Session) -> dict[UUID, int]:
    rows = (
        db.query(User.reporting_manager_id, func.count(User.id))
        .filter(User.reporting_manager_id.isnot(None))
        .group_by(User.reporting_manager_id)
        .all()
    )
    return {uid: count for uid, count in rows if uid}


@router.get("/api/organization/tree", response_model=OrgTreeOut)
def organization_tree(
    db: Annotated[Session, Depends(get_db)],
    _user: CurrentUser,
) -> OrgTreeOut:
    users = db.query(User).order_by(User.name.asc()).all()
    tasks = (
        db.query(Task)
        .options(joinedload(Task.assignee), joinedload(Task.creator))
        .filter(Task.is_deleted.is_(False), Task.status != TaskStatus.completed)
        .all()
    )
    tasks_by_user: dict[UUID, list[Task]] = {}
    unassigned: list[Task] = []
    for t in tasks:
        if t.assigned_to is None:
            unassigned.append(t)
        else:
            tasks_by_user.setdefault(t.assigned_to, []).append(t)

    by_id: dict[UUID, dict[str, Any]] = {
        u.id: {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "avatar_url": u.avatar_url,
            "role": u.role,
            "job_title": u.job_title,
            "reporting_manager_id": u.reporting_manager_id,
            "children": [],
            "tasks": tasks_by_user.get(u.id, []),
        }
        for u in users
    }
    roots: list[dict[str, Any]] = []
    for u in users:
        node = by_id[u.id]
        mid = u.reporting_manager_id
        if mid and mid in by_id:
            by_id[mid]["children"].append(node)
        else:
            roots.append(node)

    return OrgTreeOut(roots=roots, unassigned_tasks=unassigned)


@router.get("/api/users/{user_id}/reportees", response_model=list[UserOut])
def reportees(
    user_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    _user: CurrentUser,
) -> list[User]:
    return (
        db.query(User)
        .filter(User.reporting_manager_id == user_id)
        .order_by(User.name.asc())
        .all()
    )


@router.patch("/api/users/{user_id}/manager", response_model=UserOut)
def assign_manager(
    user_id: UUID,
    body: ManagerPatch,
    db: Annotated[Session, Depends(get_db)],
    actor: CurrentUser,
) -> User:
    ensure_can_assign_manager(actor)
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if body.manager_id is not None and db.get(User, body.manager_id) is None:
        raise HTTPException(status_code=404, detail="Manager not found")

    mapping = _reporting_map(db)
    if would_create_cycle(mapping, user_id, body.manager_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="That manager assignment would create a reporting cycle",
        )

    user.reporting_manager_id = body.manager_id
    write_audit(
        db,
        actor_id=actor.id,
        action="manager_assigned",
        resource_type="user",
        resource_id=str(user_id),
        meta={"manager_id": str(body.manager_id) if body.manager_id else None},
    )
    db.commit()
    db.refresh(user)
    return user


@router.get("/api/organization/members", response_model=list[UserOrgOut])
def organization_members(
    db: Annotated[Session, Depends(get_db)],
    _user: CurrentUser,
) -> list[UserOrgOut]:
    users = db.query(User).options(joinedload(User.reporting_manager)).order_by(User.name.asc()).all()
    open_counts = _open_task_counts(db)
    report_counts = _report_counts(db)
    out: list[UserOrgOut] = []
    for u in users:
        item = UserOrgOut.model_validate(u)
        item.manager_name = u.reporting_manager.name if u.reporting_manager else None
        item.direct_reports_count = report_counts.get(u.id, 0)
        item.open_tasks_count = open_counts.get(u.id, 0)
        out.append(item)
    return out
