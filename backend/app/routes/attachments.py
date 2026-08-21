import mimetypes
import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import CurrentUser
from app.models import Attachment, AuditLog
from app.services import task_service
from app.utils.rbac import ensure_can_edit_task

router = APIRouter(tags=["attachments"])

UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_BYTES = 5 * 1024 * 1024
ALLOWED = {
    "image/png",
    "image/jpeg",
    "image/webp",
    "application/pdf",
    "text/plain",
}


class AttachmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    task_id: uuid.UUID
    uploaded_by: uuid.UUID
    filename: str
    content_type: str
    size_bytes: int
    created_at: object


@router.get("/api/tasks/{task_id}/attachments", response_model=list[AttachmentOut])
def list_attachments(
    task_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    _user: CurrentUser,
) -> list[Attachment]:
    if task_service.get_task(db, task_id) is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return (
        db.query(Attachment)
        .filter(Attachment.task_id == task_id)
        .order_by(Attachment.created_at.desc())
        .all()
    )


@router.post(
    "/api/tasks/{task_id}/attachments",
    response_model=AttachmentOut,
    status_code=status.HTTP_201_CREATED,
)
async def upload_attachment(
    task_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: CurrentUser,
    file: UploadFile = File(...),
) -> Attachment:
    task = task_service.get_task(db, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    ensure_can_edit_task(user, task)

    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
    content_type = file.content_type or mimetypes.guess_type(file.filename or "")[0] or "application/octet-stream"
    if content_type not in ALLOWED:
        raise HTTPException(status_code=400, detail="File type not allowed")

    safe_name = (file.filename or "upload").replace("/", "_")[:200]
    stored = f"{uuid.uuid4()}_{safe_name}"
    path = UPLOAD_DIR / stored
    path.write_bytes(content)

    att = Attachment(
        task_id=task_id,
        uploaded_by=user.id,
        filename=safe_name,
        content_type=content_type,
        size_bytes=len(content),
        storage_path=str(path),
    )
    db.add(att)
    db.commit()
    db.refresh(att)
    return att


@router.delete("/api/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attachment(
    attachment_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: CurrentUser,
) -> None:
    att = db.get(Attachment, attachment_id)
    if att is None:
        raise HTTPException(status_code=404, detail="Attachment not found")
    task = task_service.get_task(db, att.task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    ensure_can_edit_task(user, task)
    path = Path(att.storage_path)
    if path.exists():
        path.unlink(missing_ok=True)
    db.delete(att)
    db.add(
        AuditLog(
            actor_id=user.id,
            action="attachment_deleted",
            resource_type="attachment",
            resource_id=str(attachment_id),
        )
    )
    db.commit()
