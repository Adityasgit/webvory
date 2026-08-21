from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models import UserRole


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: str
    avatar_url: str | None
    role: UserRole
    job_title: str | None
    reporting_manager_id: UUID | None
    created_at: datetime
    last_login_at: datetime | None
