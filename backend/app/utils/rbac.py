from collections.abc import Callable
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status

from app.deps import CurrentUser
from app.models import Task, User, UserRole


def require_roles(*roles: UserRole) -> Callable[[CurrentUser], User]:
    """Optional role gate (unused for mutations in this demo app)."""
    allowed = set(roles)

    def _checker(user: CurrentUser) -> User:
        if user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user

    return _checker


AdminUser = Annotated[User, Depends(require_roles(UserRole.admin))]
ManagerOrAdmin = Annotated[
    User, Depends(require_roles(UserRole.admin, UserRole.manager))
]


def can_edit_task(user: User, task: Task) -> bool:
    # Demo: any authenticated user may edit any task.
    return True


def can_delete_task(user: User) -> bool:
    # Demo: any authenticated user may delete tasks.
    return True


def ensure_can_edit_task(user: User, task: Task) -> None:
    """No-op for demo flexibility; auth is still required via CurrentUser."""
    return


def ensure_can_delete_task(user: User) -> None:
    """No-op for demo flexibility; auth is still required via CurrentUser."""
    return


def ensure_can_assign_manager(user: User) -> None:
    """No-op for demo flexibility; auth is still required via CurrentUser."""
    return


def parse_user_id(raw: str) -> UUID:
    try:
        return UUID(raw)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject",
        ) from exc
