from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import CurrentUser
from app.models import AuditLog

router = APIRouter(prefix="/api/audit", tags=["audit"])


class AuditOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: object
    actor_id: object
    action: str
    resource_type: str
    resource_id: str | None
    meta: dict | None
    created_at: object


@router.get("", response_model=list[AuditOut])
def list_audit(
    db: Annotated[Session, Depends(get_db)],
    _user: CurrentUser,
) -> list[AuditLog]:
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(100).all()
