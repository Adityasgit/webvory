# Webvory-EMS — Implementation Steps

Ordered build plan for **Webvory Task Hub**. Follow this sequence; each phase unlocks the next. Specs: [`requirement.md`](./requirement.md), [`screens.md`](./screens.md), [`take-home.md`](./take-home.md).

**Do not** port PlayStack employee EMS extras (CSV/salary). **Do** port Kanban DnD **and** Org Chart (React Flow + dagre) into `/organisation` with a **Table | Kanban | Chart** view toggle. **Auth:** Google OAuth only.

---

## How to use this doc

- Work top → bottom. Do not skip Phase 0–2 before UI polish.
- Check boxes as you finish.
- Prefer vertical slices (API + UI for one feature) once the skeleton exists.
- Reference PlayStack for Organisation: Kanban (`KanbanBoard` / Column / Card + `@dnd-kit`) **and** Chart (`OrgChart` / nodes + React Flow + dagre + cycle-safe manager APIs).

### Suggested time split (~8–12h core + bonuses)

| Phase | Focus | Effort (rough) |
|-------|--------|----------------|
| 0 | Repo + env | 30–45m |
| 1 | DB + backend skeleton | 1–1.5h |
| 2 | Google OAuth + RBAC | 1.5–2h |
| 3 | Tasks API + list/detail UI | 2–3h |
| 4 | Dashboard + comments | 1–1.5h |
| 5 | Organisation (Table + Kanban + Chart) | 2.5–3.5h |
| 6 | Users, Insights, shell polish | 1h |
| 7 | Bonus pack | 2–4h |
| 8 | Docker, tests, README | 1–1.5h |

---

## Phase 0 — Repository & tooling

**Goal:** Empty repo becomes runnable FE/BE placeholders with env templates.

### 0.1 Init

- [x] `git init` in `Webvory-EMS` (if not already)
- [x] Root `.gitignore`: `node_modules`, `.env`, `__pycache__`, `.venv`, `dist`, `uploads`, `.pytest_cache`, IDE files
- [x] Keep existing docs: `take-home.md`, `requirement.md`, `screens.md`, this `steps.md`

### 0.2 Frontend scaffold

- [x] Create Vite + React + TypeScript app in `frontend/`
- [x] Install Tailwind CSS v4 (or v3 if simpler) and configure
- [x] Add React Router
- [x] Add path aliases (`@/` → `src/`)
- [x] Folder stubs: `components/`, `pages/`, `services/`, `hooks/`, `utils/`, `context/`
- [x] Verify `npm run dev` serves a blank page

### 0.3 Backend scaffold

- [x] Create `backend/` with venv + `requirements.txt` (or `pyproject.toml`)
- [x] Install: FastAPI, uvicorn, SQLAlchemy, Alembic, psycopg, pydantic-settings, python-jose, httpx, authlib/oauth libs, python-multipart, pytest
- [x] `main.py` with health route `GET /api/health`
- [x] Layer folders: `routes/`, `services/`, `models/`, `schemas/`, `repositories/`, `utils/`
- [x] CORS for Vite origin; cookies `credentials` ready
- [x] Verify `uvicorn` starts

### 0.4 Environment

- [x] `backend/.env.example` and `frontend/.env.example`
- [x] Document vars: `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `FRONTEND_URL`, `BACKEND_URL`, `COOKIE_SECURE`
- [x] Local Postgres (Docker-only Postgres is fine even before full Compose)

**Exit criteria:** Health check works; Vite boots; env examples exist. ✅

---

## Phase 1 — Database & domain core

**Goal:** Migrations + models for all tables in requirement §8 (can soft-wire bonus tables early).

### 1.1 Alembic

- [ ] Init Alembic; wire `DATABASE_URL`
- [ ] Migration: `users`, `tasks`, `comments`
- [ ] Migration: `attachments`, `activity_events`, `notifications`, `audit_logs`
- [ ] Enums: role, status, priority, notification_type
- [ ] `users.reporting_manager_id` self-FK + `job_title`
- [ ] Indexes on `tasks.status`, `tasks.assigned_to`, `users.reporting_manager_id`

### 1.2 Models & repositories

- [ ] SQLAlchemy models matching requirement §8
- [ ] Repository stubs: `user_repo`, `task_repo`, `comment_repo` (others later)
- [ ] Soft delete field on tasks (`is_deleted`)

### 1.3 Seed

- [ ] Seed script: sample tasks/comments; optional demo reporting hierarchy among seeded/mapped emails
- [ ] Document: first Google login → `admin` if no admin exists

**Exit criteria:** `alembic upgrade head` succeeds; seed runs without crash.

---

## Phase 2 — Google OAuth, session, RBAC

**Goal:** Login/logout/`/me` work; protected API; roles enforced.

### 2.1 Backend auth

- [ ] `GET /api/auth/google` → redirect to Google
- [ ] `GET /api/auth/google/callback` → upsert user by `google_sub`/email → set httpOnly JWT cookie → redirect `FRONTEND_URL/dashboard`
- [ ] First user (or no admin yet) → role `admin`; else `member`
- [ ] `GET /api/auth/me`
- [ ] `POST /api/auth/logout` clears cookie
- [ ] Auth dependency: read cookie, verify JWT, load user
- [ ] RBAC helpers: `require_roles`, resource checks per requirement §10
- [ ] Write `audit_logs` on login and role changes

### 2.2 Google Cloud setup (manual)

- [ ] Create OAuth client (Web)
- [ ] Authorized redirect: `http://localhost:<api>/api/auth/google/callback`
- [ ] Authorized JS origins: Vite URL
- [ ] Paste credentials into `.env`

### 2.3 Frontend auth

- [ ] `AuthContext` / provider: load `/api/auth/me` with `credentials: 'include'`
- [ ] API client wrapper (fetch/axios) with credentials; global 401 → `/login`
- [ ] `/login` page: brand + “Continue with Google” only (screens §4.1)
- [ ] Protected route wrapper for app shell
- [ ] Logout action

**Exit criteria:** Full Google login → cookie → dashboard redirect → `/me` hydrates; logout works; no password UI.

---

## Phase 3 — Tasks API + Tasks UI (core CRUD)

**Goal:** Take-home §§2–4 and §8 baseline.

### 3.1 Backend tasks

- [ ] Schemas: create, update, list filters, response
- [ ] `GET /api/tasks` — `status`, `priority`, `assignee`, `search`, `sort`, `page`, `limit` (server-side)
- [ ] `GET /api/tasks/{id}`
- [ ] `POST /api/tasks`
- [ ] `PUT /api/tasks/{id}` (status change used later by Kanban)
- [ ] `DELETE /api/tasks/{id}` (soft delete)
- [ ] RBAC: member edit own created/assigned only; manager/admin any; delete manager/admin only
- [ ] On create/update: append `activity_events`

### 3.2 Frontend reusable UI (minimum set)

- [ ] Button, Input, Select, Modal, Table, Pagination
- [ ] StatusBadge, PriorityBadge, TaskCard
- [ ] LoadingSpinner, EmptyState, ConfirmDialog
- [ ] Design tokens / CSS variables (screens §7) + dark class hook (toggle later)

### 3.3 App shell

- [ ] Sidebar + TopBar per screens §3
- [ ] Routes: `/dashboard` (stub), `/tasks`, `/tasks/:id`, `/organisation` (stub), `/users` (stub), `/insights` (stub), `/profile` (stub)

### 3.4 Tasks pages

- [ ] `/tasks` list: search, filters, sort, pagination, URL query sync
- [ ] Create/Edit modal
- [ ] Confirm delete
- [ ] `/tasks/:id` detail: view + update fields
- [ ] Loading / empty / error states

**Exit criteria:** Authenticated user can CRUD tasks end-to-end with filters and pagination.

---

## Phase 4 — Dashboard + comments

**Goal:** Take-home §1 and comments on detail.

### 4.1 Dashboard API/UI

- [ ] `GET /api/dashboard` — total, pending, in_progress, completed, overdue, my tasks
- [ ] Dashboard page: six stat cards + my tasks + overdue strip
- [ ] “New task” CTA → create modal

### 4.2 Comments

- [ ] `GET/POST /api/tasks/{id}/comments`
- [ ] Comment list + composer on detail page
- [ ] Activity feed section (from `activity_events`) on detail
- [ ] Notify assignee on comment (queue for Phase 7 if needed; stub OK)

**Exit criteria:** Dashboard numbers match DB; comments persist and show on detail.

---

## Phase 5 — Organisation (Table · Kanban · Chart)

**Goal:** One `/organisation` page with view toggle; Kanban DnD; interactive org Chart; Table roster.

### 5.0 Shared shell

- [ ] `ViewToggle` component: Table | Kanban | Chart
- [ ] Persist `organisation.view` in `localStorage`
- [ ] Page header + New task; mount only the active view (lazy OK)

### 5.1 Backend hierarchy

- [ ] Port cycle check (`wouldCreateCycle`) into Python util
- [ ] `GET /api/organization/tree` — nested users + optional tasks for chart
- [ ] `PATCH /api/users/{id}/manager` — set/clear manager; 400 on cycle; RBAC admin/manager
- [ ] `GET /api/users/{id}/reportees`
- [ ] Extend `GET /api/users` with manager name, report counts, open task counts for Table view

### 5.2 Table view

- [ ] Members table: name, email, role, manager, reports, open tasks
- [ ] Person sheet: set manager (admin/manager), link to tasks
- [ ] Loading / empty / error

### 5.3 Kanban view

- [ ] Port PlayStack Kanban Board/Column/Card conceptually
- [ ] Columns: `pending` | `in_progress` | `completed` | `blocked`
- [ ] `@dnd-kit` DragOverlay; optimistic `PUT /api/tasks/{id}` status
- [ ] Card click → `/tasks/:id`; RBAC-disable drag
- [ ] Empty/loading states; horizontal scroll on mobile

### 5.4 Chart view

- [ ] Dependencies: `@xyflow/react`, `@dagrejs/dagre`
- [ ] Port OrgChart layout: person nodes, optional task nodes, detail panel
- [ ] Drag-to-reassign manager; edge break with confirm; cycle toast
- [ ] Members: read-only pan/zoom
- [ ] WS/refetch when manager or assignments change

### 5.5 Polish

- [ ] Shared search highlighting across views where cheap
- [ ] Dark mode contrast on nodes and columns

**Exit criteria:** Toggle switches all three views; Kanban status persists; Chart manager assign survives refresh and rejects cycles; Table shows hierarchy fields.

---

## Phase 6 — Users, Insights, Profile, dark mode

**Goal:** Remaining primary screens from screens.md.

### 6.1 Users

- [ ] `GET /api/users`
- [ ] `PATCH /api/users/{id}/role` (admin only) + audit log
- [ ] `/users` page: list; admin role Select

### 6.2 External API (Insights)

- [ ] Backend `GET /api/external/posts` → JSONPlaceholder with 5s timeout, error handling, optional short TTL cache
- [ ] `/insights` page: list + Retry
- [ ] Optional dashboard teaser widget

### 6.3 Profile & theme

- [ ] `/profile`: Google avatar, name, email, role; logout
- [ ] Dark mode toggle (persist `localStorage` or user pref); Tailwind `dark` class
- [ ] Top bar theme control

**Exit criteria:** All primary nav routes usable; Insights shows proxied data or clear error.

---

## Phase 7 — Bonus pack

**Goal:** Finish requirement §7 bonuses not already done.

### 7.1 Attachments

- [ ] Multipart upload endpoints; store under `uploads/` (volume later)
- [ ] Validate size/type; list/delete on task detail
- [ ] Confirm before delete

### 7.2 Notifications

- [ ] Create notifications on assign / status change / comment
- [ ] `GET /api/notifications`, mark read / read-all
- [ ] Top-bar bell + NotificationDrawer
- [ ] Unread badge

### 7.3 WebSockets

- [ ] `WS /api/ws` authenticated
- [ ] Emit `task.updated`, `task.created`, `notification.created`
- [ ] Frontend subscribe; invalidate/refetch Organisation (active view) + Tasks + notifications

### 7.4 Background jobs

- [ ] Scheduler: overdue / due-soon notifications (daily or hourly)
- [ ] Document job in README

### 7.5 Audit

- [ ] Ensure role change, delete task, login write audit rows
- [ ] Optional admin-only list endpoint (UI optional)

### 7.6 OpenAPI

- [ ] Confirm FastAPI `/docs` covers all routes with schemas
- [ ] Tag routes (auth, tasks, users, etc.)

**Exit criteria:** Bonus checklist in requirement §7 can be marked done with demos.

---

## Phase 8 — Docker, tests, README, polish

**Goal:** Submission-ready deliverables.

### 8.1 Docker

- [ ] `docker-compose.yml`: Postgres, backend, frontend
- [ ] Backend Dockerfile; frontend Dockerfile (or nginx serve build)
- [ ] Volume for uploads + Postgres data
- [ ] Document one-command up

### 8.2 Tests

- [ ] Backend pytest: auth mocks, task CRUD, RBAC, manager cycle rejection, dashboard, external timeout
- [ ] Frontend: unit test badges/utils or one component smoke (optional but preferred)
- [ ] `npm test` / `pytest` documented in README

### 8.3 README

- [ ] Overview, tech stack, architecture sketch
- [ ] Setup: env vars, Google OAuth console steps, DB migrate, seed
- [ ] Run FE, run BE, Docker
- [ ] API docs link (`/docs`)
- [ ] Assumptions (first user admin, Organisation = Table/Kanban/Chart, OAuth-only)
- [ ] Screenshots placeholders or real captures

### 8.4 Final QA pass

- [ ] Walk screens.md acceptance checklist (§9)
- [ ] Walk requirement success criteria (§1)
- [ ] Responsive smoke: 375px and desktop
- [ ] Confirm no email/password paths remain
- [ ] Confirm Organisation has Table + Kanban + Chart toggle (not employee Active/Inactive board)

**Exit criteria:** Fresh clone + env + Docker (or local) can demo the full assignment.

---

## Vertical slice order (after Phase 2)

When parallelizing UI/API, prefer this feature order:

```mermaid
flowchart TD
  Auth[Auth_OAuth] --> TasksCRUD[Tasks_CRUD]
  TasksCRUD --> Dashboard[Dashboard]
  TasksCRUD --> Comments[Comments_Activity]
  TasksCRUD --> Kanban[Organisation_Kanban]
  TasksCRUD --> OrgChart[Organisation_Chart]
  Auth --> OrgChart
  Auth --> Users[Users_RBAC_UI]
  Users --> OrgTable[Organisation_Table]
  TasksCRUD --> OrgTable
  Dashboard --> Insights[Insights_External]
  Kanban --> Live[WebSocket]
  OrgChart --> Live
  Comments --> Notif[Notifications]
  TasksCRUD --> Attach[Attachments]
  Live --> Polish[Docker_Tests_README]
  Notif --> Polish
  Attach --> Polish
```

---

## File ownership cheat sheet

| Area | Backend | Frontend |
|------|---------|----------|
| Auth | `routes/auth.py`, `services/auth.py`, `utils/security.py` | `pages/Login`, `context/AuthContext`, `services/api` |
| Tasks | `routes/tasks.py`, `repositories/task_repo.py` | `pages/Tasks`, `pages/TaskDetail`, `components/tasks/*` |
| Dashboard | `routes/dashboard.py` | `pages/Dashboard` |
| Organisation | `routes/organization.py`, manager patch, `utils/tree.py` | `pages/Organisation`, `ViewToggle`, `components/organisation/{table,kanban,chart}/*` |
| Users | `routes/users.py` | `pages/Users` |
| External | `routes/external.py`, `services/external.py` | `pages/Insights` |
| Bonus | attachments, notifications, ws, jobs | drawer, upload UI, WS hook |

---

## PlayStack reuse checklist (Organisation)

- [ ] Read PlayStack `KanbanBoard.tsx`, `KanbanColumn.tsx`, `KanbanCard.tsx`
- [ ] Replace employee Active/Inactive with four task statuses
- [ ] Replace employee status PUT with `PUT /api/tasks/:id`
- [ ] Keep DragOverlay + optimistic update + toast pattern
- [ ] Read PlayStack `OrgChart.tsx`, `OrgTreeNode.tsx`, `TaskNode.tsx`, `NodeDetailPanel.tsx`, `treeBuilder.ts`
- [ ] Port React Flow + dagre layout; person nodes = users; cycle-safe manager assign
- [ ] Add **ViewToggle** Table | Kanban | Chart (not in PlayStack as one control)
- [ ] Do **not** copy CSV import / salary / Next.js employee EMS product surface

---

## Definition of done (project)

- [ ] All take-home required sections demonstrated
- [ ] All bonus features in requirement §7 demonstrable
- [ ] Google OAuth only
- [ ] Organisation: Table + Kanban DnD + Chart (cycle-safe managers) with view toggle
- [ ] README + migrations + seed + Docker + tests + `/docs`
- [ ] `requirement.md` / `screens.md` still accurate (update if behavior diverged)

---

## After each phase

1. Smoke-test the exit criteria.
2. Commit with a clear message (when you ask to commit).
3. Only then start the next phase.
