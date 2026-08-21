import dagre from '@dagrejs/dagre'
import type { Edge, Node } from '@xyflow/react'
import type { Task, TaskStatus } from '@/types/task'

export type OrgPerson = {
  id: string
  name: string
  email: string
  role: string
  job_title: string | null
  avatar_url?: string | null
  reporting_manager_id: string | null
  children: OrgPerson[]
  tasks: Task[]
}

export type OrgTreeResponse = {
  roots: OrgPerson[]
  unassigned_tasks: Task[]
}

export const TASK_STATUS_CYCLE: Record<TaskStatus, TaskStatus> = {
  pending: 'in_progress',
  in_progress: 'completed',
  completed: 'pending',
  blocked: 'pending',
}

/** Walk up the manager chain — true if assigning newManagerId to targetId would cycle. */
export function wouldCreateCycle(
  people: Array<{ id: string; reporting_manager_id: string | null }>,
  targetId: string,
  newManagerId: string | null,
): boolean {
  if (!newManagerId) return false
  if (newManagerId === targetId) return true
  const map = new Map(people.map((p) => [p.id, p.reporting_manager_id]))
  let current: string | null = newManagerId
  const seen = new Set<string>()
  while (current) {
    if (current === targetId) return true
    if (seen.has(current)) return true
    seen.add(current)
    current = map.get(current) ?? null
  }
  return false
}

export function flattenOrg(roots: OrgPerson[]): OrgPerson[] {
  const out: OrgPerson[] = []
  const walk = (nodes: OrgPerson[]) => {
    for (const n of nodes) {
      out.push(n)
      walk(n.children || [])
    }
  }
  walk(roots)
  return out
}

type LayoutCallbacks = {
  onAssignTask?: (userId: string) => void
  onCycleTaskStatus?: (taskId: string, status: TaskStatus) => void
}

const PERSON_W = 240
const PERSON_H = 100
const TASK_W = 180
const TASK_H = 72

/**
 * Dagre TB layout for people + assigned/unassigned tasks.
 * Reporting edges: manager → reportee. Task edges: person → task (dashed).
 */
export function layoutOrgChart(
  roots: OrgPerson[],
  unassignedTasks: Task[] = [],
  callbacks: LayoutCallbacks = {},
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 120 })

  const allPeople = flattenOrg(roots)
  const edges: Edge[] = []

  for (const person of allPeople) {
    const id = String(person.id)
    g.setNode(id, { width: PERSON_W, height: PERSON_H })
  }

  for (const person of allPeople) {
    const pid = String(person.id)
    for (const child of person.children || []) {
      const cid = String(child.id)
      g.setEdge(pid, cid)
      edges.push({
        id: `${pid}-${cid}`,
        source: pid,
        target: cid,
        type: 'smoothstep',
        selectable: true,
        focusable: true,
        interactionWidth: 28,
        style: { stroke: 'var(--accent)', strokeWidth: 2 },
        animated: false,
      })
    }

    for (const task of person.tasks || []) {
      const tid = `task-${String(task.id)}`
      g.setNode(tid, { width: TASK_W, height: TASK_H })
      g.setEdge(pid, tid)
      edges.push({
        id: `${pid}-${tid}`,
        source: pid,
        target: tid,
        type: 'smoothstep',
        selectable: true,
        focusable: true,
        interactionWidth: 28,
        style: {
          stroke: '#a78bfa',
          strokeWidth: 1.5,
          strokeDasharray: '4 4',
        },
        animated: false,
      })
    }
  }

  for (const task of unassignedTasks) {
    g.setNode(`task-${String(task.id)}`, { width: TASK_W, height: TASK_H })
  }

  dagre.layout(g)

  const personNodes: Node[] = allPeople.map((person) => {
    const id = String(person.id)
    const pos = g.node(id)
    return {
      id,
      type: 'orgPerson',
      position: { x: pos.x - PERSON_W / 2, y: pos.y - PERSON_H / 2 },
      data: {
        label: person.name,
        email: person.email,
        role: person.role,
        job_title: person.job_title,
        avatar_url: person.avatar_url,
        userId: id,
        taskCount: person.tasks?.length ?? 0,
        onAssignTask: callbacks.onAssignTask,
      },
    }
  })

  const taskNodes: Node[] = []
  for (const person of allPeople) {
    for (const task of person.tasks || []) {
      const tid = `task-${String(task.id)}`
      const pos = g.node(tid)
      taskNodes.push({
        id: tid,
        type: 'orgTask',
        position: { x: pos.x - TASK_W / 2, y: pos.y - TASK_H / 2 },
        data: {
          title: task.title,
          priority: task.priority,
          status: task.status,
          due_date: task.due_date,
          taskId: String(task.id),
          userId: String(person.id),
          userName: person.name,
          onCycleTaskStatus: callbacks.onCycleTaskStatus,
        },
      })
    }
  }

  for (const task of unassignedTasks) {
    const tid = `task-${String(task.id)}`
    const pos = g.node(tid)
    taskNodes.push({
      id: tid,
      type: 'orgTask',
      position: { x: pos.x - TASK_W / 2, y: pos.y - TASK_H / 2 },
      data: {
        title: task.title,
        priority: task.priority,
        status: task.status,
        due_date: task.due_date,
        taskId: String(task.id),
        userId: null,
        userName: null,
        onCycleTaskStatus: callbacks.onCycleTaskStatus,
      },
    })
  }

  return { nodes: [...personNodes, ...taskNodes], edges }
}
