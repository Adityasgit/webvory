import { memo, useCallback, useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react'
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  Handle,
  Position,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { api } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { Button, ConfirmDialog, EmptyState, LoadingSpinner, Select } from '@/components/ui'
import { TaskFormModal } from '@/components/tasks/TaskFormModal'
import type { TaskStatus } from '@/types/task'
import {
  flattenOrg,
  layoutOrgChart,
  TASK_STATUS_CYCLE,
  wouldCreateCycle,
  type OrgPerson,
  type OrgTreeResponse,
} from './orgChartUtils'

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

const HANDLE_PERSON =
  '!z-[12] !h-3.5 !w-3.5 !border-2 !border-[var(--bg-elevated)] !bg-[var(--accent)] !shadow-[0_0_0_2px_var(--accent-soft)]'
const HANDLE_TASK =
  '!z-[12] !h-3 !w-3 !border-2 !border-[var(--bg-elevated)] !bg-violet-400 !shadow-[0_0_0_2px_rgba(167,139,250,0.35)]'

const OrgPersonNode = memo(function OrgPersonNode({ data, selected, isConnectable }: NodeProps) {
  const d = data as {
    label: string
    role: string
    job_title?: string | null
    avatar_url?: string | null
    userId: string
    taskCount: number
    onAssignTask?: (userId: string) => void
  }
  const canAssign = typeof d.onAssignTask === 'function'

  return (
    <div
      className={`w-[240px] rounded-xl border px-4 py-3 shadow-[var(--shadow-soft)] transition-all ${selected
          ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/40'
          : 'border-[var(--border)] hover:border-[var(--accent)]/50'
        } bg-[var(--surface)] text-[var(--text)]`}
    >
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className={HANDLE_PERSON}
        title="Reports to (drop connection here)"
      />
      <div className="mb-2 border-b border-[var(--border-subtle)] pb-1 text-[8px] font-bold tracking-wider text-[var(--accent)] uppercase">
        Member
      </div>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent)]">
          {d.avatar_url ? (
            <img src={d.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(d.label)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{d.label}</p>
          <p className="truncate text-xs text-[var(--text-muted)]">{d.job_title || d.role}</p>
        </div>
        {canAssign ? (
          <button
            type="button"
            title="Assign task"
            className="nodrag nopan rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
            onClick={(e) => {
              e.stopPropagation()
              d.onAssignTask?.(d.userId)
            }}
          >
            +
          </button>
        ) : null}
      </div>
      {d.taskCount > 0 ? (
        <p className="mt-2 text-[10px] font-medium text-[var(--accent)]">
          {d.taskCount} open task{d.taskCount === 1 ? '' : 's'}
        </p>
      ) : null}
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className={HANDLE_PERSON}
        title="Drag to a reportee"
      />
    </div>
  )
})

const OrgTaskNode = memo(function OrgTaskNode({ data, isConnectable }: NodeProps) {
  const d = data as {
    title: string
    priority: string
    status: TaskStatus
    due_date?: string | null
    taskId: string
    onCycleTaskStatus?: (taskId: string, status: TaskStatus) => void
  }

  return (
    <div
      className="w-[180px] rounded-lg border border-dashed border-violet-400/40 px-3 py-2 text-[var(--text)] shadow-sm"
      style={{ background: 'color-mix(in srgb, var(--surface) 90%, #7c3aed 8%)' }}
    >
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className={HANDLE_TASK}
        title="Assign to person"
      />
      <div className="mb-1.5 flex items-center justify-between border-b border-violet-400/20 pb-1 text-[8px] font-bold tracking-wider text-violet-300 uppercase">
        <span>Task</span>
        <button
          type="button"
          title="Cycle status"
          className="nodrag nopan rounded px-1 text-violet-300 hover:bg-violet-500/20"
          onClick={(e) => {
            e.stopPropagation()
            d.onCycleTaskStatus?.(d.taskId, d.status)
          }}
        >
          {d.status.replace('_', ' ')}
        </button>
      </div>
      <p className="line-clamp-2 text-xs font-semibold">{d.title}</p>
      <div className="mt-1.5 flex justify-between text-[8px] text-[var(--text-muted)]">
        <span className="capitalize">{d.priority}</span>
        {d.due_date ? <span>{new Date(d.due_date).toLocaleDateString()}</span> : null}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className={HANDLE_TASK}
        title="Drag onto a person to assign"
      />
    </div>
  )
})

const nodeTypes = { orgPerson: OrgPersonNode, orgTask: OrgTaskNode }

function normalizeTree(data: OrgTreeResponse): OrgTreeResponse {
  const normalize = (n: OrgPerson): OrgPerson => ({
    ...n,
    id: String(n.id),
    reporting_manager_id: n.reporting_manager_id ? String(n.reporting_manager_id) : null,
    children: (n.children || []).map(normalize),
    tasks: (n.tasks || []).map((t) => ({
      ...t,
      id: String(t.id),
      assigned_to: t.assigned_to ? String(t.assigned_to) : null,
    })),
  })
  return {
    roots: (data.roots || []).map(normalize),
    unassigned_tasks: (data.unassigned_tasks || []).map((t) => ({
      ...t,
      id: String(t.id),
      assigned_to: t.assigned_to ? String(t.assigned_to) : null,
    })),
  }
}

export function OrganisationChart({ search }: { search: string }) {
  const { user } = useAuth()
  const [tree, setTree] = useState<OrgTreeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<OrgPerson | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [taskModalUserId, setTaskModalUserId] = useState<string | null>(null)
  const [pendingClear, setPendingClear] = useState<{
    kind: 'manager' | 'task'
    id: string
    label: string
  } | null>(null)
  const [clearBusy, setClearBusy] = useState(false)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  // Demo: any logged-in user can edit hierarchy / assign tasks.
  const canManage = Boolean(user)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2800)
  }, [])

  const allPeople = useMemo(() => (tree ? flattenOrg(tree.roots) : []), [tree])

  const handleAssignTask = useCallback((userId: string) => {
    setTaskModalUserId(userId)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api<OrgTreeResponse>('/api/organization/tree')
      setTree(normalizeTree(data))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chart')
      setTree(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const onCycleTaskStatus = useCallback(
    async (taskId: string, current: TaskStatus) => {
      const next = TASK_STATUS_CYCLE[current]
      try {
        await api(`/api/tasks/${taskId}`, { method: 'PUT', body: { status: next } })
        showToast(`Task → ${next.replace('_', ' ')}`)
        await load()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update task')
      }
    },
    [load, showToast],
  )

  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(() => {
    if (!tree) return { nodes: [] as Node[], edges: [] as Edge[] }
    return layoutOrgChart(tree.roots, tree.unassigned_tasks, {
      onAssignTask: canManage ? handleAssignTask : undefined,
      onCycleTaskStatus: canManage ? onCycleTaskStatus : undefined,
    })
  }, [tree, canManage, handleAssignTask, onCycleTaskStatus])

  useEffect(() => {
    setNodes((prev) => {
      const posMap = new Map(prev.map((n) => [n.id, n.position]))
      return layoutNodes.map((n) => {
        const kept = posMap.get(n.id)
        const positioned = kept ? { ...n, position: kept } : n
        return {
          ...positioned,
          connectable: canManage,
          draggable: canManage,
        }
      })
    })
    setEdges(layoutEdges)
  }, [layoutNodes, layoutEdges, canManage, setNodes, setEdges])

  useEffect(() => {
    const q = search.trim().toLowerCase()
    setNodes((prev) =>
      prev.map((n) => {
        const label =
          n.type === 'orgTask'
            ? String((n.data as { title?: string }).title ?? '')
            : String((n.data as { label?: string }).label ?? '')
        const match = !q || label.toLowerCase().includes(q)
        return { ...n, style: { ...n.style, opacity: match ? 1 : 0.22 } }
      }),
    )
  }, [search, setNodes, layoutNodes])

  const patchManager = useCallback(
    async (userId: string, managerId: string | null) => {
      if (wouldCreateCycle(allPeople, userId, managerId)) {
        setError('That manager assignment would create a reporting cycle')
        return false
      }
      try {
        await api(`/api/users/${userId}/manager`, {
          method: 'PATCH',
          body: { manager_id: managerId },
        })
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Manager update failed')
        return false
      }
    },
    [allPeople],
  )

  const onNodeDragStop = useCallback(
    async (_: unknown, dragged: Node) => {
      if (!canManage) return
      const isTask = dragged.id.startsWith('task-')
      let closest: Node | null = null
      let minDist = Infinity
      for (const n of nodes) {
        if (n.id === dragged.id || n.type !== 'orgPerson') continue
        const dx = dragged.position.x - n.position.x
        const dy = dragged.position.y - n.position.y
        const dist = Math.hypot(dx, dy)
        if (dist < minDist && dist < 200) {
          minDist = dist
          closest = n
        }
      }
      if (!closest) return

      if (isTask) {
        const taskId = dragged.id.replace(/^task-/, '')
        const currentUserId = (dragged.data as { userId?: string | null }).userId
        if (currentUserId === closest.id) {
          setNodes(layoutNodes)
          setEdges(layoutEdges)
          return
        }
        try {
          await api(`/api/tasks/${taskId}`, {
            method: 'PUT',
            body: { assigned_to: closest.id },
          })
          showToast(`Task assigned to ${String(closest.data.label)}`)
          await load()
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to assign task')
          setNodes(layoutNodes)
          setEdges(layoutEdges)
        }
        return
      }

      const ok = await patchManager(dragged.id, closest.id)
      if (ok) {
        showToast(`${String(dragged.data.label)} now reports to ${String(closest.data.label)}`)
        setSelected(null)
        await load()
      } else {
        setNodes(layoutNodes)
        setEdges(layoutEdges)
      }
    },
    [canManage, nodes, layoutNodes, layoutEdges, setNodes, setEdges, load, showToast, patchManager],
  )

  const onEdgeClick = useCallback(
    (event: ReactMouseEvent, edge: Edge) => {
      event.stopPropagation()
      if (!canManage) return

      const isTaskEdge = edge.target.startsWith('task-') || edge.id.includes('-task-')
      if (isTaskEdge) {
        const taskId = edge.target.startsWith('task-')
          ? edge.target.replace(/^task-/, '')
          : edge.id.split('-task-')[1]
        const taskNode = nodes.find((n) => n.id === `task-${taskId}` || n.id === edge.target)
        setPendingClear({
          kind: 'task',
          id: taskId,
          label: String((taskNode?.data as { title?: string })?.title ?? 'task'),
        })
        return
      }

      const employee = nodes.find((n) => n.id === edge.target)
      setPendingClear({
        kind: 'manager',
        id: edge.target,
        label: String(employee?.data.label ?? 'member'),
      })
    },
    [canManage, nodes, showToast],
  )

  const confirmClearLink = useCallback(async () => {
    if (!pendingClear) return
    setClearBusy(true)
    setError(null)
    try {
      if (pendingClear.kind === 'task') {
        await api(`/api/tasks/${pendingClear.id}`, {
          method: 'PUT',
          body: { assigned_to: null, clear_assignee: true },
        })
        showToast('Task unassigned')
      } else {
        const ok = await patchManager(pendingClear.id, null)
        if (!ok) return
        showToast(`Cleared manager for ${pendingClear.label}`)
        setSelected(null)
      }
      setPendingClear(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear link')
    } finally {
      setClearBusy(false)
    }
  }, [pendingClear, patchManager, load, showToast])

  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!canManage) return
      const sourceId = connection.source
      const targetId = connection.target
      if (!sourceId || !targetId) return
      if (sourceId === targetId) return

      const sourceTask = sourceId.startsWith('task-')
      const targetTask = targetId.startsWith('task-')

      if (!sourceTask && !targetTask) {
        // source handle = manager, target handle = reportee
        const ok = await patchManager(targetId, sourceId)
        if (ok) {
          const mgr = nodes.find((n) => n.id === sourceId)
          const emp = nodes.find((n) => n.id === targetId)
          showToast(`${String(emp?.data.label)} now reports to ${String(mgr?.data.label)}`)
          setSelected(null)
          await load()
        }
        return
      }

      if (sourceTask !== targetTask) {
        const userId = sourceTask ? targetId : sourceId
        const taskId = (sourceTask ? sourceId : targetId).replace(/^task-/, '')
        try {
          await api(`/api/tasks/${taskId}`, {
            method: 'PUT',
            body: { assigned_to: userId },
          })
          showToast('Task assigned')
          await load()
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to assign task')
        }
      }
    },
    [canManage, nodes, load, showToast, patchManager],
  )

  const onNodeClick = useCallback(
    (_: unknown, node: Node) => {
      if (node.id.startsWith('task-')) return
      setSelected(allPeople.find((p) => p.id === node.id) ?? null)
    },
    [allPeople],
  )

  async function assignManagerFromPanel(userId: string, managerId: string) {
    const mid = managerId || null
    const ok = await patchManager(userId, mid)
    if (ok) {
      showToast(mid ? 'Reporting manager updated' : 'Set as org root')
      setSelected(null)
      await load()
    }
  }

  if (loading) return <LoadingSpinner />
  if (!tree) return <EmptyState title="Could not load org chart" description={error ?? undefined} />
  if (!tree.roots.length) return <EmptyState title="No org tree yet" />

  return (
    <div className="relative grid gap-4 lg:grid-cols-[1fr_280px]">
      {toast ? (
        <div className="absolute top-3 left-1/2 z-20 -translate-x-1/2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm shadow-lg">
          {toast}
        </div>
      ) : null}
      <div className="relative h-[min(70vh,640px)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]">
        {error ? <p className="alert-error m-3">{error}</p> : null}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={onNodeDragStop}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          nodesDraggable={canManage}
          nodesConnectable={canManage}
          edgesFocusable={canManage}
          elementsSelectable
          selectNodesOnDrag={false}
          connectionRadius={28}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          colorMode="dark"
          defaultEdgeOptions={{
            type: 'smoothstep',
            selectable: true,
            focusable: true,
            interactionWidth: 28,
            style: { stroke: 'var(--accent)', strokeWidth: 2 },
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#243041" gap={18} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeStrokeWidth={2}
            nodeColor={(n) => (n.type === 'orgTask' ? '#a78bfa' : '#2ec4b6')}
            maskColor="rgba(10, 13, 18, 0.7)"
            style={{ background: 'var(--bg-elevated)' }}
          />
        </ReactFlow>
        <p className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-md bg-[var(--surface)]/90 px-2 py-1 text-[10px] text-[var(--text-muted)]">
          Drag bottom handle → top handle to link · click an edge to disconnect · or drag onto a manager
        </p>
      </div>

      <aside className="surface p-4">
        <h3 className="text-sm font-semibold text-[var(--text)]">Detail</h3>
        {!selected ? (
          <p className="mt-2 text-sm text-[var(--text-muted)]">Select a person node.</p>
        ) : (
          <div className="mt-3 space-y-3 text-sm">
            <p className="font-medium text-[var(--text)]">{selected.name}</p>
            <p className="text-[var(--text-muted)]">{selected.email}</p>
            <p className="capitalize text-[var(--text-muted)]">{selected.role}</p>
            {canManage ? (
              <div>
                <p className="mb-1 text-xs tracking-wide text-[var(--text-muted)] uppercase">
                  Reporting manager
                </p>
                <Select
                  value={selected.reporting_manager_id ?? ''}
                  onChange={(e) => void assignManagerFromPanel(selected.id, e.target.value)}
                >
                  <option value="">Root —</option>
                  {allPeople
                    .filter((p) => p.id !== selected.id)
                    .filter((p) => !wouldCreateCycle(allPeople, selected.id, p.id))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </Select>
                {selected.reporting_manager_id ? (
                  <Button
                    variant="secondary"
                    type="button"
                    className="mt-2 w-full"
                    onClick={() =>
                      setPendingClear({
                        kind: 'manager',
                        id: selected.id,
                        label: selected.name,
                      })
                    }
                  >
                    Clear manager
                  </Button>
                ) : null}
              </div>
            ) : null}
            <div>
              <p className="mb-1 text-xs tracking-wide text-[var(--text-muted)] uppercase">Open tasks</p>
              <ul className="space-y-1">
                {(selected.tasks ?? []).length === 0 ? (
                  <li className="text-[var(--text-muted)]">None</li>
                ) : (
                  selected.tasks.map((t) => (
                    <li key={t.id}>
                      <a className="text-[var(--accent)] hover:underline" href={`/tasks/${t.id}`}>
                        {t.title}
                      </a>
                    </li>
                  ))
                )}
              </ul>
            </div>
            <Button variant="secondary" type="button" onClick={() => setSelected(null)}>
              Close
            </Button>
          </div>
        )}
      </aside>

      <ConfirmDialog
        open={!!pendingClear}
        title={pendingClear?.kind === 'task' ? 'Unassign task?' : 'Clear reporting link?'}
        message={
          pendingClear?.kind === 'task'
            ? `Unassign “${pendingClear.label}” from their current owner?`
            : `Remove the reporting manager for ${pendingClear?.label ?? 'this member'}? They become an org root.`
        }
        confirmLabel={pendingClear?.kind === 'task' ? 'Unassign' : 'Clear link'}
        onConfirm={() => void confirmClearLink()}
        onClose={() => {
          if (!clearBusy) setPendingClear(null)
        }}
        loading={clearBusy}
      />

      <TaskFormModal
        open={!!taskModalUserId}
        defaultAssignedTo={taskModalUserId}
        onClose={() => setTaskModalUserId(null)}
        onSaved={() => {
          setTaskModalUserId(null)
          void load()
        }}
      />
    </div>
  )
}
