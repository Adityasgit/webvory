import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Input,
  LoadingSpinner,
  Pagination,
  PriorityBadge,
  Select,
  StatusBadge,
  Table,
} from '@/components/ui'
import { TaskFormModal } from '@/components/tasks/TaskFormModal'
import { ViewToggle, type View } from '@/components/organisation/ViewToggle'
import { OrganisationKanban } from '@/components/organisation/OrganisationKanban'
import { OrganisationChart } from '@/components/organisation/OrganisationChart'
import { api } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import type { Task, TaskListResponse } from '@/types/task'
import type { User } from '@/services/api'

const STORAGE_KEY = 'tasks.view'
const LEGACY_STORAGE_KEY = 'organisation.view'

function readSavedView(): View {
  const saved = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY)
  if (saved === 'table' || saved === 'kanban') return saved
  if (saved === 'org' || saved === 'chart') return 'org'
  return 'table'
}

export function TasksPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState<View>(readSavedView)
  const [boardSearch, setBoardSearch] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [data, setData] = useState<TaskListResponse | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [deleting, setDeleting] = useState<Task | null>(null)
  const [deletingBusy, setDeletingBusy] = useState(false)

  const query = useMemo(
    () => ({
      search: params.get('search') ?? '',
      status: params.get('status') ?? '',
      priority: params.get('priority') ?? '',
      assignee: params.get('assignee') ?? '',
      sort: params.get('sort') ?? 'updated_at',
      page: Number(params.get('page') ?? '1'),
    }),
    [params],
  )

  const canDelete = user?.role === 'admin' || user?.role === 'manager'

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, view)
  }, [view])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams()
      if (query.search) qs.set('search', query.search)
      if (query.status) qs.set('status', query.status)
      if (query.priority) qs.set('priority', query.priority)
      if (query.assignee) qs.set('assignee', query.assignee)
      qs.set('sort', query.sort)
      qs.set('page', String(query.page))
      qs.set('limit', '10')
      const res = await api<TaskListResponse>(`/api/tasks?${qs.toString()}`)
      setData(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    if (view !== 'table') return
    void load()
  }, [load, view])

  useEffect(() => {
    void api<User[]>('/api/users').then(setUsers).catch(() => setUsers([]))
  }, [])

  function patchParams(next: Record<string, string>) {
    const merged = new URLSearchParams(params)
    Object.entries(next).forEach(([k, v]) => {
      if (!v) merged.delete(k)
      else merged.set(k, v)
    })
    if (!('page' in next)) merged.set('page', '1')
    setParams(merged)
  }

  async function confirmDelete() {
    if (!deleting) return
    setDeletingBusy(true)
    try {
      await api(`/api/tasks/${deleting.id}`, { method: 'DELETE' })
      setDeleting(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeletingBusy(false)
    }
  }

  function openCreate() {
    setEditing(null)
    setModalOpen(true)
  }

  function onTaskSaved() {
    if (view === 'table') {
      void load()
      if (editing) navigate(`/tasks/${editing.id}`)
    } else {
      setRefreshKey((k) => k + 1)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">Search, filter, board, and org hierarchy.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle value={view} onChange={setView} />
          <Button type="button" onClick={openCreate}>
            New task
          </Button>
        </div>
      </div>

      {view === 'table' ? (
        <>
          <div className="surface grid gap-3 p-4 md:grid-cols-5">
            <Input
              placeholder="Search…"
              value={query.search}
              onChange={(e) => patchParams({ search: e.target.value })}
            />
            <Select value={query.status} onChange={(e) => patchParams({ status: e.target.value })}>
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
              <option value="blocked">Blocked</option>
            </Select>
            <Select value={query.priority} onChange={(e) => patchParams({ priority: e.target.value })}>
              <option value="">All priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </Select>
            <Select value={query.assignee} onChange={(e) => patchParams({ assignee: e.target.value })}>
              <option value="">All assignees</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
            <Select
              value={query.sort}
              onChange={(e) => patchParams({ sort: e.target.value, page: String(query.page) })}
            >
              <option value="updated_at">Sort: updated</option>
              <option value="created_at">Sort: created</option>
              <option value="due_date">Sort: due date</option>
              <option value="title">Sort: title</option>
              <option value="priority">Sort: priority</option>
            </Select>
          </div>

          {error ? <p className="alert-error">{error}</p> : null}
          {loading ? <LoadingSpinner /> : null}

          {!loading && data && data.items.length === 0 ? (
            <EmptyState
              title={
                query.search || query.status || query.priority || query.assignee
                  ? 'No matching tasks'
                  : 'No tasks yet'
              }
              description="Create a task to get started."
              action={
                <Button type="button" onClick={openCreate}>
                  New task
                </Button>
              }
            />
          ) : null}

          {!loading && data && data.items.length > 0 ? (
            <>
              <Table>
                <thead className="bg-[var(--bg-elevated)] text-xs tracking-wide text-[var(--text-muted)] uppercase">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Assignee</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Due</th>
                    <th className="px-4 py-3">Updated</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((task) => (
                    <tr
                      key={task.id}
                      className="border-t border-[var(--border-subtle)] hover:bg-[var(--surface-hover)]/60"
                    >
                      <td className="px-4 py-3">
                        <Link
                          className="font-medium text-[var(--text)] hover:text-[var(--accent)]"
                          to={`/tasks/${task.id}`}
                        >
                          {task.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{task.assignee?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <PriorityBadge priority={task.priority} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={task.status} />
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{task.due_date ?? '—'}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">
                        {new Date(task.updated_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            type="button"
                            onClick={() => {
                              setEditing(task)
                              setModalOpen(true)
                            }}
                          >
                            Edit
                          </Button>
                          {canDelete ? (
                            <Button variant="ghost" type="button" onClick={() => setDeleting(task)}>
                              Delete
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <Pagination
                page={data.page}
                pages={data.pages}
                total={data.total}
                onPageChange={(page) => patchParams({ page: String(page) })}
              />
            </>
          ) : null}
        </>
      ) : (
        <>
          <Input
            placeholder="Search people or tasks…"
            value={boardSearch}
            onChange={(e) => setBoardSearch(e.target.value)}
            className="max-w-md"
          />
          <div key={`${view}-${refreshKey}`}>
            {view === 'kanban' ? <OrganisationKanban search={boardSearch} /> : null}
            {view === 'org' ? <OrganisationChart search={boardSearch} /> : null}
          </div>
        </>
      )}

      <TaskFormModal
        open={modalOpen}
        task={editing}
        onClose={() => setModalOpen(false)}
        onSaved={onTaskSaved}
      />
      <ConfirmDialog
        open={!!deleting}
        title="Delete task?"
        message={`Soft-delete “${deleting?.title ?? ''}”. This can be restored only from the database.`}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        loading={deletingBusy}
      />
    </div>
  )
}
