import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Button,
  ConfirmDialog,
  EmptyState,
  LoadingSpinner,
  PriorityBadge,
  StatusBadge,
  TextArea,
} from '@/components/ui'
import { TaskFormModal } from '@/components/tasks/TaskFormModal'
import { api } from '@/services/api'
import type { Task } from '@/types/task'

type Comment = {
  id: string
  body: string
  created_at: string
  user?: { name: string } | null
}

type Activity = {
  id: string
  action: string
  meta: Record<string, unknown> | null
  created_at: string
  user?: { name: string } | null
}

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [task, setTask] = useState<Task | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [activity, setActivity] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [posting, setPosting] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [t, c, a] = await Promise.all([
        api<Task>(`/api/tasks/${id}`),
        api<Comment[]>(`/api/tasks/${id}/comments`),
        api<Activity[]>(`/api/tasks/${id}/activity`),
      ])
      setTask(t)
      setComments(c)
      setActivity(a)
    } catch (err) {
      setTask(null)
      setError(err instanceof Error ? err.message : 'Failed to load task')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  async function onDelete() {
    if (!task) return
    setBusy(true)
    try {
      await api(`/api/tasks/${task.id}`, { method: 'DELETE' })
      navigate('/tasks')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
      setBusy(false)
    }
  }

  async function onComment(e: FormEvent) {
    e.preventDefault()
    if (!id || !note.trim()) return
    setPosting(true)
    try {
      await api(`/api/tasks/${id}/comments`, { method: 'POST', body: { body: note.trim() } })
      setNote('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Comment failed')
    } finally {
      setPosting(false)
    }
  }

  if (loading) return <LoadingSpinner />
  if (error && !task) {
    return (
      <EmptyState
        title="Task not found"
        description={error}
        action={
          <Link to="/tasks" className="text-[var(--accent)] underline">
            Back to tasks
          </Link>
        }
      />
    )
  }
  if (!task) return null

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/tasks" className="text-sm text-[var(--accent)] hover:underline">
        ← Back to tasks
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--text)]">{task.title}</h1>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => setEditOpen(true)}>
            Edit
          </Button>
          <Button type="button" variant="danger" onClick={() => setDeleteOpen(true)}>
            Delete
          </Button>
        </div>
      </div>

      {error ? <p className="alert-error">{error}</p> : null}

      <div className="grid gap-6 md:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-6">
          <section className="surface p-5">
            <h2 className="mb-2 text-sm font-semibold text-[var(--text)]">Description</h2>
            <p className="whitespace-pre-wrap text-sm text-[var(--text-muted)]">
              {task.description?.trim() ? task.description : 'No description.'}
            </p>
          </section>

          <section className="surface p-5">
            <h2 className="mb-3 text-sm font-semibold text-[var(--text)]">Comments</h2>
            <ul className="mb-4 space-y-3">
              {comments.length === 0 ? (
                <li className="text-sm text-[var(--text-muted)]">No comments yet.</li>
              ) : (
                comments.map((c) => (
                  <li key={c.id} className="rounded-lg bg-[var(--bg-elevated)] px-3 py-2">
                    <p className="text-xs text-[var(--text-muted)]">
                      {c.user?.name ?? 'User'} · {new Date(c.created_at).toLocaleString()}
                    </p>
                    <p className="mt-1 text-sm text-[var(--text)]">{c.body}</p>
                  </li>
                ))
              )}
            </ul>
            <form className="space-y-2" onSubmit={onComment}>
              <TextArea
                rows={3}
                placeholder="Add a note…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <Button type="submit" disabled={posting || !note.trim()}>
                {posting ? 'Posting…' : 'Post comment'}
              </Button>
            </form>
          </section>
        </div>

        <aside className="space-y-6">
          <div className="surface space-y-3 p-5 text-sm">
            <Meta label="Assignee" value={task.assignee?.name ?? 'Unassigned'} />
            <Meta label="Created by" value={task.creator?.name ?? '—'} />
            <Meta label="Due date" value={task.due_date ?? '—'} />
            <Meta label="Created" value={new Date(task.created_at).toLocaleString()} />
            <Meta label="Updated" value={new Date(task.updated_at).toLocaleString()} />
          </div>
          <section className="surface p-5">
            <h2 className="mb-3 text-sm font-semibold text-[var(--text)]">Activity</h2>
            <ul className="space-y-2 text-sm">
              {activity.length === 0 ? (
                <li className="text-[var(--text-muted)]">No activity yet.</li>
              ) : (
                activity.map((a) => (
                  <li key={a.id} className="border-b border-[var(--border-subtle)] pb-2 last:border-0">
                    <p className="font-medium text-[var(--text)]">{a.action.replace('_', ' ')}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {a.user?.name ?? 'System'} · {new Date(a.created_at).toLocaleString()}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </section>
        </aside>
      </div>

      <TaskFormModal open={editOpen} task={task} onClose={() => setEditOpen(false)} onSaved={() => void load()} />
      <ConfirmDialog
        open={deleteOpen}
        title="Delete task?"
        message={`Soft-delete “${task.title}”.`}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => void onDelete()}
        loading={busy}
      />
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs tracking-wide text-[var(--text-muted)] uppercase">{label}</p>
      <p className="mt-0.5 font-medium text-[var(--text)]">{value}</p>
    </div>
  )
}
