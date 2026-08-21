# Webvory Task Hub

Internal Task & Management Dashboard for the Webvory take-home assignment.

## Tech stack

- **Frontend:** React, Vite, TypeScript, Tailwind CSS v4, React Router, `@dnd-kit`, `@xyflow/react`
- **Backend:** Python, FastAPI, SQLAlchemy, Alembic, PostgreSQL
- **Auth:** Google OAuth only → JWT in httpOnly cookie
- **Extras:** Organisation Table/Kanban/Chart, notifications, attachments, WebSocket, APScheduler, Docker

## Quick start (local)

### 1. Database

```bash
# Docker Postgres (preferred when image pull works)
docker compose up -d db

# Or use a local PostgreSQL 16/17 instance and create role/db `webvory`/`webvory`
```

### 2. Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env   # then fill Google OAuth secrets
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload --port 8000
```

API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: [http://localhost:3000](http://localhost:3000)

### Google OAuth

1. Create an OAuth **Web** client in Google Cloud Console  
2. Authorized JavaScript origin: `http://localhost:3000`  
3. Redirect URI: `http://localhost:8000/api/auth/google/callback`  
4. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `backend/.env`

There is **no** email/password login.

## Docker (full stack)

```bash
# Ensure backend/.env exists with JWT_SECRET + Google credentials
docker compose up --build
```

- Web: `http://localhost:3000`  
- API: `http://localhost:8000`  

Uploads persist in the `webvory_uploads` volume.

## Features map

| Area | Notes |
|------|--------|
| Dashboard | Totals, my tasks, overdue |
| Tasks | CRUD, filters, pagination, comments, activity, attachments |
| Organisation | View toggle **Table / Kanban / Chart** |
| Team | List users; admin role changes |
| Auth | Google OAuth, RBAC (`admin` / `manager` / `member`) |

## Assumptions

- First Google user becomes `admin` when no admin exists (seed also creates demo users with `@webvory.local` emails).
- Organisation Chart uses OAuth users + `reporting_manager_id` (not a separate employee EMS).
- Kanban columns are task statuses, not Active/Inactive employees.
- Soft-delete is used for tasks.

## Tests

```bash
cd backend
pytest
```

## Project layout

```
Webvory-EMS/
├── frontend/
├── backend/
├── docker-compose.yml
├── requirement.md
├── screens.md
├── steps.md
└── take-home.md
```
