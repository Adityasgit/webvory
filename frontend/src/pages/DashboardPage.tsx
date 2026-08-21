import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, LoadingSpinner, PriorityBadge, StatusBadge, TaskCard } from '@/components/ui'
import {
  ChartLegend,
  PriorityBarChart,
  StatusDonutChart,
  WorkloadBarChart,
  type ChartDatum,
} from '@/components/dashboard/DashboardCharts'
import { TaskFormModal } from '@/components/tasks/TaskFormModal'
import { api } from '@/services/api'
import type { Task } from '@/types/task'

type DashboardData = {
  total: number
  pending: number
  in_progress: number
  completed: number
  blocked: number
  overdue: number
  my_tasks: number
  priority_low: number
  priority_medium: number
  priority_high: number
  priority_urgent: number
  my_tasks_list: Task[]
  overdue_list: Task[]
}

const STATUS_COLORS = {
  pending: '#94a3b8',
  in_progress: '#38bdf8',
  completed: '#34d399',
  blocked: '#fbbf24',
}

const PRIORITY_COLORS = {
  low: '#94a3b8',
  medium: '#7dd3fc',
  high: '#fb923c',
  urgent: '#f87171',
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await api<DashboardData>('/api/dashboard'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const statusData: ChartDatum[] = useMemo(
    () =>
      data
        ? [
            { name: 'Pending', value: data.pending, color: STATUS_COLORS.pending },
            { name: 'In progress', value: data.in_progress, color: STATUS_COLORS.in_progress },
            { name: 'Completed', value: data.completed, color: STATUS_COLORS.completed },
            { name: 'Blocked', value: data.blocked, color: STATUS_COLORS.blocked },
          ]
        : [],
    [data],
  )

  const priorityData: ChartDatum[] = useMemo(
    () =>
      data
        ? [
            { name: 'Low', value: data.priority_low, color: PRIORITY_COLORS.low },
            { name: 'Medium', value: data.priority_medium, color: PRIORITY_COLORS.medium },
            { name: 'High', value: data.priority_high, color: PRIORITY_COLORS.high },
            { name: 'Urgent', value: data.priority_urgent, color: PRIORITY_COLORS.urgent },
          ]
        : [],
    [data],
  )

  const workloadData: ChartDatum[] = useMemo(() => {
    if (!data) return []
    const open = Math.max(0, data.total - data.completed)
    const onTrack = Math.max(0, open - data.overdue)
    return [
      { name: 'On track', value: onTrack, color: '#2ec4b6' },
      { name: 'Overdue', value: data.overdue, color: '#f07178' },
      { name: 'Completed', value: data.completed, color: '#34d399' },
    ]
  }, [data])

  if (loading) return <LoadingSpinner />

  const highlightStats = [
    { label: 'Total', value: data?.total ?? 0 },
    { label: 'Overdue', value: data?.overdue ?? 0 },
    { label: 'Assigned to me', value: data?.my_tasks ?? 0 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Team workload at a glance.</p>
        </div>
        <Button type="button" onClick={() => setModalOpen(true)}>
          New task
        </Button>
      </div>

      {error ? (
        <div className="space-y-3">
          <p className="alert-error">{error}</p>
          <Button type="button" variant="secondary" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : null}

      {!error && data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {highlightStats.map((s) => (
              <div key={s.label} className="surface px-4 py-4">
                <p className="text-xs tracking-wide text-[var(--text-muted)] uppercase">{s.label}</p>
                <p className="font-display mt-2 text-3xl font-bold tracking-tight text-[var(--text)]">
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <section className="surface p-4 lg:col-span-1">
              <h2 className="text-sm font-semibold text-[var(--text)]">Tasks by status</h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Distribution across the board.</p>
              <StatusDonutChart data={statusData} />
              <ChartLegend data={statusData} />
            </section>

            <section className="surface p-4 lg:col-span-1">
              <h2 className="text-sm font-semibold text-[var(--text)]">Tasks by priority</h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Where attention is concentrated.</p>
              <PriorityBarChart data={priorityData} />
            </section>

            <section className="surface p-4 lg:col-span-1">
              <h2 className="text-sm font-semibold text-[var(--text)]">Workload</h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">On track vs overdue vs done.</p>
              <WorkloadBarChart data={workloadData} />
            </section>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-[var(--text)]">My tasks</h2>
              {data.my_tasks_list.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">Nothing assigned to you.</p>
              ) : (
                data.my_tasks_list.map((t) => (
                  <Link key={t.id} to={`/tasks/${t.id}`} className="block">
                    <TaskCard
                      title={t.title}
                      status={t.status}
                      priority={t.priority}
                      assignee={t.assignee?.name}
                      dueDate={t.due_date}
                    />
                  </Link>
                ))
              )}
            </section>
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-[var(--text)]">Overdue</h2>
              {data.overdue_list.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">No overdue tasks.</p>
              ) : (
                <ul className="surface space-y-2 p-3">
                  {data.overdue_list.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] py-2 last:border-0"
                    >
                      <Link
                        to={`/tasks/${t.id}`}
                        className="font-medium text-[var(--text)] hover:text-[var(--accent)]"
                      >
                        {t.title}
                      </Link>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={t.status} />
                        <PriorityBadge priority={t.priority} />
                        <span className="text-xs text-[var(--danger)]">{t.due_date}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      ) : null}

      {!error && !data ? (
        <p className="text-sm text-[var(--text-muted)]">No dashboard data available.</p>
      ) : null}

      <TaskFormModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={() => void load()} />
    </div>
  )
}
