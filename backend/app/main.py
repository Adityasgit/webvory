from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.jobs import start_scheduler
from app.routes import (
    attachments,
    audit,
    auth,
    dashboard,
    health,
    notifications,
    organization,
    tasks,
    users,
)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    start_scheduler()
    yield


settings = get_settings()

app = FastAPI(
    title="Webvory Task Hub API",
    version="0.1.0",
    description="Internal task & management dashboard API",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(users.router)
app.include_router(dashboard.router)
app.include_router(organization.router)
app.include_router(attachments.router)
app.include_router(notifications.router)
app.include_router(audit.router)
