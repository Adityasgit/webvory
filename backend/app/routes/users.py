from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import CurrentUser
from app.models import User, UserRole
from app.repositories import user_repo
from app.schemas.auth import UserOut
from app.services.auth_service import write_audit

router = APIRouter(prefix="/api/users", tags=["users"])


class RolePatch(BaseModel):
    role: UserRole


@router.get("", response_model=list[UserOut])
def list_users(
    db: Annotated[Session, Depends(get_db)],
    _user: CurrentUser,
) -> list[User]:
    return user_repo.list_users(db)


@router.patch("/{user_id}/role", response_model=UserOut)
def patch_role(
    user_id: UUID,
    body: RolePatch,
    db: Annotated[Session, Depends(get_db)],
    actor: CurrentUser,
) -> User:
    """Any authenticated user may set admin / manager / member (demo-friendly RBAC)."""
    user = user_repo.get_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    old = user.role
    user.role = body.role
    write_audit(
        db,
        actor_id=actor.id,
        action="role_changed",
        resource_type="user",
        resource_id=str(user_id),
        meta={"from": old.value, "to": body.role.value},
    )
    db.commit()
    db.refresh(user)
    return user
