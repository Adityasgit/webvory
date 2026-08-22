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
2. Authorized JavaScript origins:
   - Local: `http://localhost:3000`
   - Production: `https://webvory.vercel.app`
3. Authorized redirect URIs:
   - Local: `http://localhost:8000/api/auth/google/callback`
   - Production: `https://webvory.vercel.app/api/auth/google/callback`
4. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `backend/.env` (local) and in Vercel env / `.env.vercel` (deploy)

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

## Deploy (Vercel)

This monorepo uses root [`vercel.json`](./vercel.json) with [Vercel Services](https://vercel.com/docs/services): Vite frontend (`web`) + FastAPI (`api`) on one domain. `/api/*` routes to the backend; everything else to the SPA.

**Live:** [https://webvory.vercel.app](https://webvory.vercel.app) — API base is the same host (`https://webvory.vercel.app/api/...`).

1. Import the repo in Vercel and set **Framework Preset** to **Services** (Root Directory = `.`).
2. Copy values from root [`.env.vercel`](./.env.vercel) into the Vercel project env (file is gitignored; create locally from your secrets):
   - `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - `FRONTEND_URL=https://webvory.vercel.app`
   - `BACKEND_URL=https://webvory.vercel.app`
   - `GOOGLE_REDIRECT_URI=https://webvory.vercel.app/api/auth/google/callback`
   - `COOKIE_SECURE=true`
3. In Google Cloud Console, add:
   - JS origin: `https://webvory.vercel.app`
   - Redirect URI: `https://webvory.vercel.app/api/auth/google/callback`
4. Deploy (`vercel` / Git push). Same-origin `/api` is the default; `VITE_API_URL` is optional and mainly for a separate API host.

**Note:** FastAPI on Vercel runs as serverless functions. WebSockets and long-lived schedulers (APScheduler) may need a long-running host (Docker / Railway / Render) if those features must be production-critical. Prefer hosting Postgres externally (Neon, Supabase, etc.).

**Frontend-only alternative:** set Root Directory to `frontend`, omit Services, and either rewrite `/api` to an external backend URL or set `VITE_API_URL` at build time and allow that origin in backend CORS (`FRONTEND_URL`).

## Project layout

```
Webvory-EMS/
├── frontend/
├── backend/
├── vercel.json
├── docker-compose.yml
├── requirement.md
├── screens.md
├── steps.md
└── take-home.md
```
