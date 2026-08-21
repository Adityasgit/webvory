"""Lightweight background job: flag overdue tasks with due_soon notifications."""

from datetime import date, datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import NotificationType, Task, TaskStatus
from app.routes.notifications import create_notification

_scheduler: BackgroundScheduler | None = None


def overdue_job() -> None:
    db: Session = SessionLocal()
    try:
        today = date.today()
        tasks = (
            db.query(Task)
            .filter(
                Task.is_deleted.is_(False),
                Task.due_date.isnot(None),
                Task.due_date <= today,
                Task.status != TaskStatus.completed,
                Task.assigned_to.isnot(None),
            )
            .all()
        )
        for t in tasks:
            assert t.assigned_to is not None
            create_notification(
                db,
                user_id=t.assigned_to,
                type=NotificationType.due_soon,
                title=f"Overdue: {t.title}",
                body=f"Due {t.due_date}",
                task_id=t.id,
            )
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


def start_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        return
    _scheduler = BackgroundScheduler()
    _scheduler.add_job(overdue_job, "interval", hours=1, id="overdue_check", replace_existing=True)
    _scheduler.start()
