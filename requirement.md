# Webvory-EMS — Product Requirements

Internal Task & Management Dashboard for the Webvory take-home assignment. This document is the implementation source of truth. It covers every required section in [`take-home.md`](./take-home.md) plus all listed bonus features.

**Product name:** Webvory Task Hub  
**Auth:** Google OAuth only (no email/password)  
**Organisation module:** Single page with a **view toggle** — Table · Kanban · Chart (org hierarchy). Kanban from PlayStack `@dnd-kit` board; Chart from PlayStack React Flow + dagre org chart (adapted to users + reporting managers + linked tasks).

---

## 1. Overview & goals

### Goals

- Let a team create, assign, track, and complete tasks from a central dashboard.
- Demonstrate a clean full-stack architecture with reusable frontend components and backend layers.
- Ship a polished internal business tool (not a bare demo): loading/empty/error states, confirmations, responsive layout.
- Meet all take-home requirements and all bonus features.

### Success criteria

- [ ] Dashboard shows required task aggregates and “my tasks”
- [ ] Full task CRUD with comments, filters, search, sort, server-side pagination
- [ ] Task detail page with update + comments + activity
- [ ] Organisation page with view toggle (Table / Kanban / Chart), Kanban DnD, and interactive org chart
- [ ] Google OAuth login/logout and protected routes
- [ ] RBAC enforced on API and UI
- [ ] External API integration with timeout/error handling
- [ ] Bonus features implemented (see §7)
- [ ] README, migrations, seed, Docker, tests, OpenAPI docs delivered

---

## 2. Tech stack & repo layout

### Stack (locked)

| Layer | Choice |
|-------|--------|
| Frontend | React, Vite, TypeScript, Tailwind CSS |
| Backend | Python + FastAPI |
| Database | PostgreSQL |
| Auth | Google OAuth 2.0 → JWT in httpOnly cookie |
| DnD (Organisation Kanban) | `@dnd-kit` (PlayStack Kanban pattern) |
| Org chart (Organisation Chart) | `@xyflow/react` + `@dagrejs/dagre` (PlayStack OrgChart pattern) |
| Realtime | WebSockets (FastAPI) |
| Container | Docker Compose (frontend, backend, Postgres) |

### Target structure

```
Webvory-EMS/
├── frontend/
│   ├── src/
│   │   ├── components/     # ui/ + feature folders
│   │   ├── pages/
│   │   ├── services/       # API clients
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── context/        # auth, theme
│   │   └── App.tsx
│   └── ...
├── backend/
│   ├── routes/
│   ├── services/
│   ├── models/
│   ├── schemas/
│   ├── repositories/
│   ├── utils/
│   └── main.py
├── docker-compose.yml
├── README.md
├── take-home.md
├── requirement.md
└── screens.md
```

Responsibilities stay separated: routes → services → repositories → models; frontend pages compose reusable components and call services.

---

## 3. Authentication (Google OAuth only)

### Rules

- **No** email/password registration or login.
- **No** bcrypt password hashing for credentials.
- Users authenticate only via Google OAuth.
- After Google consent, backend upserts user by email and issues a JWT in an **httpOnly** cookie.
- Frontend never stores the access token in `localStorage`.
- Logout clears the cookie and ends the session.
- Unauthenticated users are redirected to `/login`.
- All `/api/*` routes (except OAuth start/callback and health) require a valid session.

### OAuth flow

1. User clicks “Continue with Google” on `/login`.
2. Frontend redirects to `GET /api/auth/google`.
3. Backend redirects to Google consent screen.
4. Google redirects to `GET /api/auth/google/callback`.
5. Backend validates code, fetches profile, upserts `users` row, sets JWT cookie, redirects to `/dashboard`.
6. SPA calls `GET /api/auth/me` to hydrate session.

### Roles (RBAC)

| Role | Provisioning |
|------|----------------|
| `admin` | First Google user to sign in becomes `admin`. Additional admins only via role change by an existing admin. Seed script may create a known admin email mapping. |
| `manager` | Assigned by admin |
| `member` | Default for every new Google sign-in after the first admin |

---

## 4. Functional requirements (take-home §§1–10)

### 4.1 Dashboard (§1)

Show:

- Total tasks
- Pending tasks
- In Progress tasks
- Completed tasks
- Overdue tasks (due_date &lt; today AND status ≠ completed)
- Tasks assigned to the current user

Optional on same page: short “my tasks” list and overdue highlights (see [`screens.md`](./screens.md)).

### 4.2 Task management (§2)

Users can:

- Create / edit / delete a task
- Assign to a team member
- Set priority: `low` | `medium` | `high` | `urgent`
- Set due date
- Change status: `pending` | `in_progress` | `completed` | `blocked`
- Add description
- Add notes/comments

### 4.3 Task list (§3)

Columns: task name, assigned user, priority, status, due date, created date, last updated date.

Controls (all **server-side** via query params):

- Search (title/description)
- Filter: status, priority, assignee
- Sorting (e.g. due_date, created_at, title, priority)
- Pagination (`page`, `limit`)

### 4.4 Backend API (§4)

REST APIs with:

- Request validation (Pydantic schemas)
- Proper HTTP status codes
- Centralized error handling
- Pagination, filtering, search
- PostgreSQL integration

### 4.5 Database (§5)

Minimum entities: Users, Tasks, Comments/Notes — plus bonus entities in §8.

### 4.6 Reusable code (§6)

**Frontend (required components):** Button, Modal, Input, Select, Table, Pagination, StatusBadge, PriorityBadge, TaskCard — plus shared LoadingSpinner, EmptyState, ConfirmDialog.

**Backend layers:** routes, services, models, repositories, schemas, auth utilities — not monolithic files.

### 4.7 External API integration (§7)

**Chosen provider:** [JSONPlaceholder](https://jsonplaceholder.typicode.com) (public, no API key).

- Backend proxy: `GET /api/external/posts` (and/or `/api/external/users`)
- Demonstrates: outbound HTTP, timeouts (e.g. 5s), error handling, response mapping, graceful degradation if upstream fails
- Document rate-limit considerations (public API; cache short TTL optional)
- Surface data on Insights page and optionally a dashboard widget

### 4.8 Task details (§8)

Route `/tasks/:id` shows full task info, status, priority, assignee, due date, description, comments, activity history. User can update the task from this page.

### 4.9 UI/UX (§9)

Real internal-tool feel: clean layout, responsive, clear status indicators, consistent spacing/components, loading/empty/error states, confirm before delete. Tailwind for styling. Modern visual direction (see screens.md).

### 4.10 Project structure (§10)

Match the layout in §2; README documents setup and assumptions.

---

## 5. Organisation module (Table · Kanban · Chart)

**Route:** `/organisation`  
**UI:** Segmented **view toggle** (persist last choice in `localStorage`): **Table** | **Kanban** | **Chart**. Same page, same filters where applicable; only the presentation changes.

Inspiration from PlayStack-EMS:

| View | PlayStack source | Webvory adaptation |
|------|------------------|--------------------|
| Kanban | `KanbanBoard` / `KanbanColumn` / `KanbanCard` + `@dnd-kit` | Task status columns (not employee Active/Inactive) |
| Chart | `OrgChart` / `OrgTreeNode` / `TaskNode` + React Flow + dagre | Users as people nodes; `reporting_manager_id` hierarchy; task nodes linked to assignees |
| Table | PlayStack employees table patterns | Team/task-oriented table of people (or tasks-in-org context — see below) |

### 5.1 Shared chrome

- Page title “Organisation”, subtitle, primary actions (e.g. New task / Assign manager where role allows).
- View toggle control (Table / Kanban / Chart).
- Optional shared filters: search, role, assignee/priority (Kanban), department-like label if we store `title`/`team` on user profile.

### 5.2 Table view

- Tabular list of **team members** in the organisation: name, email, role, reporting manager, direct report count, open task count.
- Row click → profile side panel or `/users` detail focus; manager column links into Chart.
- Sort/filter server-side via `GET /api/users` (extended query params) or dedicated `GET /api/organization/members`.
- Empty / loading / error states.

### 5.3 Kanban view

| Column ID | Label | Maps to `tasks.status` |
|-----------|-------|------------------------|
| `pending` | Pending | `pending` |
| `in_progress` | In Progress | `in_progress` |
| `completed` | Completed | `completed` |
| `blocked` | Blocked | `blocked` |

- Drag task card onto a column → `PUT /api/tasks/{id}` with new `status`.
- Optimistic UI + toast; rollback on failure.
- Card click → `/tasks/:id`.
- RBAC: members move tasks they can edit; admins/managers move any.

### 5.4 Chart view (org hierarchy)

- Interactive tree of users using React Flow + dagre (top → bottom).
- Each **person node**: name, avatar, role, optional job title; shows direct-report affordances.
- **Task nodes** (optional, PlayStack-style): tasks linked to assignee with dashed edges; unassigned tasks in a pool.
- Admin/manager: drag to reassign **reporting manager**; connect handles; click edge to clear reporting link.
- Cycle prevention when setting manager (`wouldCreateCycle` logic ported from PlayStack `treeBuilder`).
- Node detail panel: view/edit manager, list direct reports, jump to user’s tasks.
- APIs: `GET /api/organization/tree`, `PATCH /api/users/{id}/manager`, `GET /api/users/{id}/reportees`.

### 5.5 Out of scope for Organisation

- Full PlayStack **employee EMS** (CSV import, salary fields, soft-delete employee catalog as a second product).
- Employee Active/Inactive Kanban semantics (Webvory Kanban is **task** status only).

---

## 6. External API (detail)

| Item | Spec |
|------|------|
| Upstream | `https://jsonplaceholder.typicode.com/posts` |
| App endpoint | `GET /api/external/posts?limit=10` |
| Timeout | 5 seconds |
| Failure | Return `502` or empty list with error message; UI shows retry |
| Caching | Optional in-memory TTL ~60s |
| Display | `/insights` page + optional dashboard strip |

---

## 7. Bonus features (all in scope)

| Bonus | Implementation notes |
|-------|----------------------|
| Login/authentication | Google OAuth + JWT cookie |
| Role-based access | `admin` / `manager` / `member` (§10) |
| Kanban task board | Organisation → Kanban view (§5.3) |
| Drag-and-drop tasks | `@dnd-kit` on Organisation Kanban |
| Org hierarchy chart | Organisation → Chart view (§5.4); React Flow + dagre |
| Task activity history | Append-only `activity_events` on task changes |
| File attachments | Upload to local/object storage; `attachments` table; max size/type validation |
| Notifications | In-app notifications on assign / mention / status change |
| Dark mode | Theme toggle (class-based Tailwind); persist preference |
| WebSocket / live updates | Channel for task list/board invalidation; push notification events |
| Docker setup | `docker-compose.yml` for Postgres + backend + frontend |
| Automated tests | Backend pytest for auth, tasks, RBAC; FE smoke/unit for key utils |
| API documentation | FastAPI OpenAPI/Swagger at `/docs` |
| Background jobs | e.g. overdue checker / notification fan-out (APScheduler or similar) |
| Audit logs | Persist security-sensitive actions (role change, delete task, login) in `audit_logs` |

---

## 8. Data model

### Enums

- `user_role`: `admin` | `manager` | `member`
- `task_status`: `pending` | `in_progress` | `completed` | `blocked`
- `task_priority`: `low` | `medium` | `high` | `urgent`
- `notification_type`: `task_assigned` | `status_changed` | `comment_added` | `due_soon` | `system`

### Tables

**users**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID / serial PK | |
| google_sub | string unique | Google subject |
| name | string | |
| email | string unique | |
| avatar_url | string nullable | From Google |
| role | user_role | Default `member` |
| job_title | string nullable | Shown on org nodes |
| reporting_manager_id | FK users.id nullable | Org hierarchy; null = root |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| last_login_at | timestamptz nullable | |

**tasks**

| Column | Type | Notes |
|--------|------|-------|
| id | PK | |
| title | string | Required |
| description | text nullable | |
| status | task_status | Default `pending` |
| priority | task_priority | Default `medium` |
| assigned_to | FK users.id nullable | |
| created_by | FK users.id | |
| due_date | date/timestamptz nullable | |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| is_deleted | bool | Soft delete optional but preferred |

**comments**

| Column | Type | Notes |
|--------|------|-------|
| id | PK | |
| task_id | FK tasks | |
| user_id | FK users | |
| body | text | |
| created_at | timestamptz | |

**attachments**

| Column | Type | Notes |
|--------|------|-------|
| id | PK | |
| task_id | FK tasks | |
| uploaded_by | FK users | |
| filename | string | |
| content_type | string | |
| size_bytes | int | |
| storage_path | string | |
| created_at | timestamptz | |

**activity_events**

| Column | Type | Notes |
|--------|------|-------|
| id | PK | |
| task_id | FK tasks | |
| user_id | FK users nullable | |
| action | string | e.g. `created`, `status_changed`, `assigned`, `commented` |
| meta | JSON | old/new values |
| created_at | timestamptz | |

**notifications**

| Column | Type | Notes |
|--------|------|-------|
| id | PK | |
| user_id | FK users | Recipient |
| type | notification_type | |
| title | string | |
| body | string nullable | |
| task_id | FK nullable | |
| is_read | bool | Default false |
| created_at | timestamptz | |

**audit_logs**

| Column | Type | Notes |
|--------|------|-------|
| id | PK | |
| actor_id | FK users nullable | |
| action | string | |
| resource_type | string | |
| resource_id | string nullable | |
| meta | JSON | |
| created_at | timestamptz | |

### Relationships

- User 1→N Users (reportees via `reporting_manager_id`; self-FK, cycle forbidden)
- User 1→N Tasks (as assignee / creator)
- Task 1→N Comments, Attachments, Activity events
- User 1→N Notifications, Audit entries

---

## 9. API contract

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/auth/google` | No | Start OAuth |
| GET | `/api/auth/google/callback` | No | OAuth callback; set cookie |
| POST | `/api/auth/logout` | Yes | Clear cookie |
| GET | `/api/auth/me` | Yes | Current user |

### Tasks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/tasks` | Yes | List; query: `status`, `priority`, `assignee`, `search`, `sort`, `page`, `limit` |
| GET | `/api/tasks/{id}` | Yes | Detail + comments summary |
| POST | `/api/tasks` | Yes | Create |
| PUT | `/api/tasks/{id}` | Yes | Update (incl. status for Organisation Kanban DnD) |
| DELETE | `/api/tasks/{id}` | Yes | Delete (soft preferred) |

### Organisation / hierarchy

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/organization/tree` | Yes | Nested user tree + optional unassigned/open tasks for Chart view |
| GET | `/api/users/{id}/reportees` | Yes | Direct reports |
| PATCH | `/api/users/{id}/manager` | Admin/Manager | Set/clear `reporting_manager_id`; reject cycles |

### Comments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/tasks/{id}/comments` | Yes | List comments |
| POST | `/api/tasks/{id}/comments` | Yes | Add comment |

### Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users` | Yes | Team list |
| PATCH | `/api/users/{id}/role` | Admin | Change role |
| POST | `/api/users` | Admin | Optional manual create (not required if OAuth-only provisioning) |

### Dashboard & external

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/dashboard` | Yes | Aggregate stats + my tasks counts |
| GET | `/api/external/posts` | Yes | Proxied JSONPlaceholder posts |

### Attachments / activity / notifications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/tasks/{id}/attachments` | Yes | List |
| POST | `/api/tasks/{id}/attachments` | Yes | Upload |
| DELETE | `/api/attachments/{id}` | Yes | Remove |
| GET | `/api/tasks/{id}/activity` | Yes | Activity history |
| GET | `/api/notifications` | Yes | Current user notifications |
| PATCH | `/api/notifications/{id}/read` | Yes | Mark read |
| PATCH | `/api/notifications/read-all` | Yes | Mark all read |

### Realtime

| Channel | Description |
|---------|-------------|
| `WS /api/ws` | Authenticated WebSocket; events: `task.updated`, `task.created`, `notification.created` |

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Liveness |

OpenAPI available at `/docs` (FastAPI default).

---

## 10. RBAC matrix

| Action | admin | manager | member |
|--------|-------|---------|--------|
| View dashboard / tasks / Organisation | Yes | Yes | Yes |
| Switch Organisation views (Table / Kanban / Chart) | Yes | Yes | Yes |
| Create task | Yes | Yes | Yes |
| Edit any task | Yes | Yes | No |
| Edit own assigned / created task | Yes | Yes | Yes |
| Delete task | Yes | Yes | No |
| Change any task status (incl. Kanban DnD) | Yes | Yes | Own only |
| Assign tasks | Yes | Yes | Create + self-assign; managers/admins assign freely |
| Reassign reporting manager (Chart / API) | Yes | Yes | No |
| Manage comments on visible tasks | Yes | Yes | Yes |
| Upload attachments on editable tasks | Yes | Yes | Yes |
| Change user roles | Yes | No | No |
| View audit logs | Yes | No | No |
| View Insights (external) | Yes | Yes | Yes |

**Assignee rule (locked):** Members may create tasks and edit tasks they created or are assigned to. Managers and admins may edit/delete any task. Only admins change roles. Only admin/manager change reporting managers.

---

## 11. Non-functional requirements

- Frontend + backend validation for required fields, enums, due dates, file size/type.
- HTTP codes: `200`/`201` success, `400` validation, `401` unauthenticated, `403` forbidden, `404` not found, `502` upstream failure.
- Confirmation modal before destructive actions (delete task, delete attachment).
- Loading, empty, and error states on every primary screen.
- Responsive: usable from ~375px upward; Organisation Kanban scrolls horizontally; Chart pans/zooms; Table stacks to cards on small screens.
- Accessibility: labeled controls, keyboard-focusable dialogs, sufficient contrast in light and dark themes.
- Secrets only in env vars (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`, `DATABASE_URL`, etc.).

---

## 12. Out of scope

- Email/password authentication or local password reset
- PlayStack employee EMS extras (CSV import, salary/HR field catalog as a separate product)
- Next.js monorepo / MongoDB stack from PlayStack (patterns reused; stack is Vite + FastAPI + Postgres)
- Native mobile apps

---

## 13. Deliverables checklist

- [ ] Complete frontend + backend source
- [ ] `README.md`: overview, stack, setup, env vars, DB, run FE/BE, API docs link, assumptions
- [ ] Database migrations + seed data (sample users mapping / tasks / comments)
- [ ] Docker Compose for local full stack
- [ ] Automated tests (backend required; frontend key paths preferred)
- [ ] OpenAPI/Swagger documentation
- [ ] This `requirement.md` and `screens.md` kept accurate if behavior changes

---

## 14. Assumptions

1. Google Cloud OAuth client credentials are provided via environment variables for local/demo runs.
2. First successful Google login bootstraps the sole initial `admin`; seed may also pin an admin by email for demos.
3. “Organisation” is one module with three views: **Table**, **Kanban** (task statuses), **Chart** (user reporting hierarchy + optional task nodes).
4. Soft delete for tasks is preferred so activity/audit history remains coherent.
5. File attachments are stored on local disk in Docker volume for the assignment (S3-compatible optional later).
6. JSONPlaceholder is sufficient to demonstrate external integration without API keys.
7. WebSocket updates invalidate or patch client caches; full offline sync is not required.
8. Reporting managers are assigned among OAuth users; Chart interactions call the same manager APIs as Table actions where applicable.

---

## 15. Traceability to take-home.md

| Take-home section | This doc |
|-------------------|----------|
| §1 Dashboard | §4.1 |
| §2 Task management | §4.2 |
| §3 Task list | §4.3 |
| §4 Backend API | §4.4, §9 |
| §5 Database | §4.5, §8 |
| §6 Reusable code | §4.6 |
| §7 External API | §4.7, §6 |
| §8 Task details | §4.8 |
| §9 UI/UX | §4.9, screens.md |
| §10 Project structure | §2 |
| Bonus features | §5, §7 |
| Deliverables | §13 |
