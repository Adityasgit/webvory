from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.db import SessionLocal, get_db
from app.deps import CurrentUser, get_current_user
from app.models import Notification, NotificationType, User
from app.utils.security import COOKIE_NAME, decode_access_token
from app.repositories import user_repo

router = APIRouter(tags=["notifications", "websocket"])


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    type: NotificationType
    title: str
    body: str | None
    task_id: UUID | None
    is_read: bool
    created_at: datetime


class ConnectionManager:
    def __init__(self) -> None:
        self.active: dict[str, list[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active.setdefault(user_id, []).append(websocket)

    def disconnect(self, user_id: str, websocket: WebSocket) -> None:
        conns = self.active.get(user_id, [])
        if websocket in conns:
            conns.remove(websocket)
        if not conns and user_id in self.active:
            del self.active[user_id]

    async def send_user(self, user_id: str, payload: dict) -> None:
        for ws in list(self.active.get(user_id, [])):
            try:
                await ws.send_json(payload)
            except Exception:
                self.disconnect(user_id, ws)


manager = ConnectionManager()


def create_notification(
    db: Session,
    *,
    user_id: UUID,
    type: NotificationType,
    title: str,
    body: str | None = None,
    task_id: UUID | None = None,
) -> Notification:
    n = Notification(
        user_id=user_id,
        type=type,
        title=title,
        body=body,
        task_id=task_id,
    )
    db.add(n)
    db.flush()
    return n


@router.get("/api/notifications", response_model=list[NotificationOut])
def list_notifications(
    db: Annotated[Session, Depends(get_db)],
    user: CurrentUser,
) -> list[Notification]:
    return (
        db.query(Notification)
        .filter(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )


@router.patch("/api/notifications/{notification_id}/read", response_model=NotificationOut)
def mark_read(
    notification_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    user: CurrentUser,
) -> Notification:
    n = db.get(Notification, notification_id)
    if n is None or n.user_id != user.id:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.is_read = True
    db.commit()
    db.refresh(n)
    return n


@router.patch("/api/notifications/read-all", status_code=status.HTTP_204_NO_CONTENT)
def mark_all_read(
    db: Annotated[Session, Depends(get_db)],
    user: CurrentUser,
) -> None:
    db.query(Notification).filter(
        Notification.user_id == user.id, Notification.is_read.is_(False)
    ).update({"is_read": True})
    db.commit()


@router.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    token = websocket.cookies.get(COOKIE_NAME)
    if not token:
        await websocket.close(code=4401)
        return
    try:
        payload = decode_access_token(token)
        user_id = str(payload["sub"])
    except Exception:
        await websocket.close(code=4401)
        return

    db = SessionLocal()
    try:
        user = user_repo.get_by_id(db, UUID(user_id))
        if user is None:
            await websocket.close(code=4401)
            return
    finally:
        db.close()

    await manager.connect(user_id, websocket)
    try:
        await websocket.send_json({"type": "connected", "at": datetime.now(timezone.utc).isoformat()})
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
