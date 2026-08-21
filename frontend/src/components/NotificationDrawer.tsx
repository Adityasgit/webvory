import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/services/api'
import { Button } from '@/components/ui'

type Notification = {
  id: string
  title: string
  body: string | null
  is_read: boolean
  task_id: string | null
  created_at: string
}

export function NotificationDrawer({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    void api<Notification[]>('/api/notifications')
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [open])

  async function markAll() {
    await api('/api/notifications/read-all', { method: 'PATCH' })
    setItems((list) => list.map((n) => ({ ...n, is_read: true })))
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[1px]"
        aria-label="Close"
        onClick={onClose}
      />
      <aside className="animate-drawer-in relative z-10 flex h-full w-full max-w-md flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
          <h2 className="font-display font-semibold text-[var(--text)]">Notifications</h2>
          <div className="flex gap-2">
            <Button variant="ghost" type="button" onClick={() => void markAll()}>
              Mark all read
            </Button>
            <Button variant="ghost" type="button" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? <p className="text-sm text-[var(--text-muted)]">Loading…</p> : null}
          {!loading && items.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">You’re all caught up.</p>
          ) : null}
          <ul className="space-y-2">
            {items.map((n) => (
              <li
                key={n.id}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  n.is_read
                    ? 'border-[var(--border-subtle)] bg-[var(--bg-elevated)]'
                    : 'border-[var(--accent)]/30 bg-[var(--accent-soft)]'
                }`}
              >
                {n.task_id ? (
                  <Link
                    to={`/tasks/${n.task_id}`}
                    onClick={onClose}
                    className="font-medium text-[var(--text)] hover:underline"
                  >
                    {n.title}
                  </Link>
                ) : (
                  <p className="font-medium text-[var(--text)]">{n.title}</p>
                )}
                {n.body ? <p className="text-[var(--text-muted)]">{n.body}</p> : null}
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  )
}
