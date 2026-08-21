"""Seed demo users, tasks, comments, and a small reporting hierarchy.

Note: Production users come from Google OAuth. The first Google login becomes
admin when no admin exists (see Phase 2). This seed uses synthetic google_sub
values for local demos only.

Usage (from backend/):
  .venv\\Scripts\\python -m app.seed
"""

from __future__ import annotations

from datetime import date, timedelta

from app.db import SessionLocal
from app.models import (
    ActivityEvent,
    Comment,
    Task,
    TaskPriority,
    TaskStatus,
    User,
    UserRole,
)


def seed() -> None:
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == "admin@webvory.local").one_or_none()
        if existing:
            print("Seed already applied (admin@webvory.local exists). Skipping.")
            return

        admin = User(
            google_sub="seed-admin",
            name="Ada Admin",
            email="admin@webvory.local",
            role=UserRole.admin,
            job_title="Head of Operations",
        )
        manager = User(
            google_sub="seed-manager",
            name="Morgan Manager",
            email="manager@webvory.local",
            role=UserRole.manager,
            job_title="Engineering Manager",
        )
        member = User(
            google_sub="seed-member",
            name="Sam Member",
            email="member@webvory.local",
            role=UserRole.member,
            job_title="Software Engineer",
        )
        member2 = User(
            google_sub="seed-member-2",
            name="Riley Report",
            email="riley@webvory.local",
            role=UserRole.member,
            job_title="Designer",
        )

        db.add_all([admin, manager, member, member2])
        db.flush()

        manager.reporting_manager_id = admin.id
        member.reporting_manager_id = manager.id
        member2.reporting_manager_id = manager.id

        today = date.today()
        tasks = [
            Task(
                title="Ship Organisation view toggle",
                description="Table / Kanban / Chart on one page.",
                status=TaskStatus.in_progress,
                priority=TaskPriority.high,
                assigned_to=member.id,
                created_by=manager.id,
                due_date=today + timedelta(days=3),
            ),
            Task(
                title="Wire Google OAuth",
                description="Cookie session after Google consent.",
                status=TaskStatus.pending,
                priority=TaskPriority.urgent,
                assigned_to=manager.id,
                created_by=admin.id,
                due_date=today + timedelta(days=1),
            ),
            Task(
                title="Dashboard stats",
                description="Aggregate counters for the home board.",
                status=TaskStatus.completed,
                priority=TaskPriority.medium,
                assigned_to=member2.id,
                created_by=manager.id,
                due_date=today - timedelta(days=2),
            ),
            Task(
                title="Blocked: waiting on API keys",
                description="Need Google Cloud OAuth client credentials.",
                status=TaskStatus.blocked,
                priority=TaskPriority.high,
                assigned_to=admin.id,
                created_by=admin.id,
                due_date=today - timedelta(days=1),
            ),
        ]
        db.add_all(tasks)
        db.flush()

        db.add(
            Comment(
                task_id=tasks[0].id,
                user_id=manager.id,
                body="Let's mirror PlayStack Kanban + OrgChart patterns.",
            )
        )
        db.add(
            Comment(
                task_id=tasks[0].id,
                user_id=member.id,
                body="ViewToggle stub is ready; wiring Chart next.",
            )
        )
        db.add(
            ActivityEvent(
                task_id=tasks[0].id,
                user_id=manager.id,
                action="created",
                meta={"title": tasks[0].title},
            )
        )
        db.add(
            ActivityEvent(
                task_id=tasks[0].id,
                user_id=manager.id,
                action="status_changed",
                meta={"from": "pending", "to": "in_progress"},
            )
        )

        db.commit()
        print("Seed complete:")
        print("  admin@webvory.local (admin)")
        print("  manager@webvory.local (manager) reports to admin")
        print("  member@webvory.local / riley@webvory.local report to manager")
        print("  4 tasks + comments + activity events")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
