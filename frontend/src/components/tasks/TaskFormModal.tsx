import { useEffect, useState, type FormEvent } from 'react'
import { Button, Input, Label, Modal, Select, TextArea } from '@/components/ui'
import { api } from '@/services/api'
import type { Task, TaskInput, TaskPriority, TaskStatus } from '@/types/task'
import type { User } from '@/services/api'

const STATUSES: TaskStatus[] = ['pending', 'in_progress', 'completed', 'blocked']
const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent']

const empty: TaskInput = {
  title: '',
  description: '',
  status: 'pending',
  priority: 'medium',
  assigned_to: null,
  due_date: null,
}

export function TaskFormModal({
  open,
  task,
  onClose,
  onSaved,
  defaultAssignedTo,
}: {
  open: boolean
  task?: Task | null
  onClose: () => void
  onSaved: () => void
  /** Prefill assignee when creating a new task (org chart assign). */
  defaultAssignedTo?: string | null
}) {
  const [form, setForm] = useState<TaskInput>(empty)
  const [users, setUsers] = useState<User[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (task) {
      setForm({
        title: task.title,
        description: task.description ?? '',
        status: task.status,
        priority: task.priority,
        assigned_to: task.assigned_to,
        due_date: task.due_date,
      })
    } else {
      setForm({ ...empty, assigned_to: defaultAssignedTo ?? null })
    }
    void api<User[]>('/api/users').then(setUsers).catch(() => setUsers([]))
  }, [open, task, defaultAssignedTo])
  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description || null,
        status: form.status,
        priority: form.priority,
        assigned_to: form.assigned_to || null,
        due_date: form.due_date || null,
        ...(task
          ? {
              clear_assignee: !form.assigned_to,
              clear_due_date: !form.due_date,
            }
          : {}),
      }
      if (task) {
        await api(`/api/tasks/${task.id}`, { method: 'PUT', body: payload })
      } else {
        await api('/api/tasks', { method: 'POST', body: payload })
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={task ? 'Edit task' : 'New task'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="task-form" disabled={saving || !form.title.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <form id="task-form" className="space-y-3" onSubmit={onSubmit}>
        {error ? <p className="alert-error">{error}</p> : null}
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <TextArea
            id="description"
            rows={3}
            value={form.description ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as TaskStatus }))}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select
              id="priority"
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="assignee">Assignee</Label>
            <Select
              id="assignee"
              value={form.assigned_to ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, assigned_to: e.target.value || null }))
              }
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="due">Due date</Label>
            <Input
              id="due"
              type="date"
              value={form.due_date ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value || null }))}
            />
          </div>
        </div>
      </form>
    </Modal>
  )
}
