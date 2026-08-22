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
3. Authorized redirect URIs (OAuth callback hits the **API** host):
   - Local: `http://localhost:8000/api/auth/google/callback`
   - Production: `https://webvory.onrender.com/api/auth/google/callback`
4. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `backend/.env` (local) and in **Render** env (production). See [`.env.vercel`](./.env.vercel) for the full production template.

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

## Deploy (production)

**Live:** Frontend [https://webvory.vercel.app](https://webvory.vercel.app) · API [https://webvory.onrender.com](https://webvory.onrender.com)

Split hosting: Vite SPA on Vercel, FastAPI on Render. The frontend calls the API via `VITE_API_URL`; Google OAuth starts and completes on Render.

### Render (backend)

Copy the **Render** block from root [`.env.vercel`](./.env.vercel) into the Render service **Environment**:

| Variable | Example |
|----------|---------|
| `DATABASE_URL` | Neon Postgres URL |
| `JWT_SECRET` | long random string |
| `GOOGLE_CLIENT_ID` | from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | from Google Cloud Console |
| `BACKEND_URL` | `https://webvory.onrender.com` |
| `FRONTEND_URL` | `https://webvory.vercel.app` (CORS + post-login redirect) |
| `GOOGLE_REDIRECT_URI` | `https://webvory.onrender.com/api/auth/google/callback` (optional if `BACKEND_URL` is set) |
| `COOKIE_SECURE` | `true` |

Redeploy after changing env vars.

### Vercel (frontend)

Set **Root Directory** to `frontend`. Build env:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://webvory.onrender.com` |

Redeploy after changing `VITE_API_URL` (inlined at build time).

### Google Cloud Console

- **Authorized JavaScript origins:** `https://webvory.vercel.app`, `http://localhost:3000`
- **Authorized redirect URIs:** `https://webvory.onrender.com/api/auth/google/callback`, `http://localhost:8000/api/auth/google/callback`

Do **not** register `https://webvory.vercel.app/api/auth/google/callback` — the callback route lives on Render.

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
