import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { api } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { EmptyState, LoadingSpinner, PriorityBadge, StatusBadge } from '@/components/ui'
import type { Task, TaskListResponse, TaskStatus } from '@/types/task'

const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: 'pending', title: 'Pending' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'completed', title: 'Completed' },
  { id: 'blocked', title: 'Blocked' },
]

export function OrganisationKanban({ search }: { search: string }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api<TaskListResponse>('/api/tasks?limit=100&sort=updated_at')
      setTasks(res.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load board')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return tasks
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.assignee?.name ?? '').toLowerCase().includes(q),
    )
  }, [tasks, search])

  const activeTask = filtered.find((t) => t.id === activeId)

  function canDrag(_task: Task) {
    // Demo: any logged-in user can move any task.
    return Boolean(user)
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const overId = e.over?.id ? String(e.over.id) : null
    const taskId = String(e.active.id)
    if (!overId) return
    const status = COLUMNS.find((c) => c.id === overId)?.id
    if (!status) return
    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.status === status || !canDrag(task)) return

    const prev = tasks
    setTasks((list) => list.map((t) => (t.id === taskId ? { ...t, status } : t)))
    try {
      await api(`/api/tasks/${taskId}`, { method: 'PUT', body: { status } })
    } catch {
      setTasks(prev)
      setError('Failed to update status')
    }
  }

  if (loading) return <LoadingSpinner />
  if (!tasks.length) return <EmptyState title="No tasks" description="Create tasks to use the board." />

  return (
    <div className="space-y-3">
      {error ? <p className="alert-error">{error}</p> : null}
      <DndContext collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const items = filtered.filter((t) => t.status === col.id)
            return (
              <div
                key={col.id}
                className="min-w-[260px] flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/80 p-3"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--text)]">{col.title}</h3>
                  <span className="rounded-md bg-[var(--surface)] px-2 text-xs text-[var(--text-muted)]">
                    {items.length}
                  </span>
                </div>
                <ColumnDrop id={col.id}>
                  <div className="min-h-[120px] space-y-2">
                    {items.length === 0 ? (
                      <p className="px-1 text-xs text-[var(--text-muted)]">No tasks</p>
                    ) : (
                      items.map((t) => (
                        <KanbanCard
                          key={t.id}
                          task={t}
                          draggable={canDrag(t)}
                          onOpen={() => navigate(`/tasks/${t.id}`)}
                        />
                      ))
                    )}
                  </div>
                </ColumnDrop>
              </div>
            )
          })}
        </div>
        <DragOverlay>
          {activeTask ? (
            <div className="select-none rounded-xl border border-[var(--accent)] bg-[var(--surface)] p-3 shadow-lg cursor-grabbing">
              <div className="mb-2 flex items-start gap-2">
                <GripIcon className="mt-0.5 shrink-0 text-[var(--text-muted)]" />
                <p className="text-sm font-medium text-[var(--text)]">{activeTask.title}</p>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

function ColumnDrop({ id, children }: { id: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className={isOver ? 'rounded-lg ring-2 ring-[var(--accent)]/40' : ''}>
      {children}
    </div>
  )
}

function GripIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="12"
      height="16"
      viewBox="0 0 12 16"
      fill="currentColor"
      aria-hidden
    >
      <circle cx="3" cy="3" r="1.5" />
      <circle cx="9" cy="3" r="1.5" />
      <circle cx="3" cy="8" r="1.5" />
      <circle cx="9" cy="8" r="1.5" />
      <circle cx="3" cy="13" r="1.5" />
      <circle cx="9" cy="13" r="1.5" />
    </svg>
  )
}

function KanbanCard({
  task,
  draggable,
  onOpen,
}: {
  task: Task
  draggable: boolean
  onOpen: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: !draggable,
  })
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.4 : 1 }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`select-none rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 transition hover:border-[var(--accent)]/35 ${
        draggable
          ? isDragging
            ? 'cursor-grabbing'
            : 'cursor-grab active:cursor-grabbing'
          : 'cursor-pointer opacity-80'
      }`}
      {...(draggable ? { ...listeners, ...attributes } : {})}
      onClick={(e) => {
        e.stopPropagation()
        if (!isDragging) onOpen()
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        {draggable ? (
          <span
            className="shrink-0 text-[var(--text-muted)]"
            title="Drag to change status"
            aria-label="Drag handle"
          >
            <GripIcon />
          </span>
        ) : null}
        <div className="flex min-w-0 flex-wrap gap-2">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
        </div>
      </div>
      <p className="text-sm font-medium text-[var(--text)]">{task.title}</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{task.assignee?.name ?? 'Unassigned'}</p>
    </div>
  )
}
