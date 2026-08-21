export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export type UserBrief = {
  id: string
  name: string
  email: string
  avatar_url?: string | null
  role?: string | null
}

export type Task = {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assigned_to: string | null
  created_by: string
  due_date: string | null
  created_at: string
  updated_at: string
  is_deleted: boolean
  assignee?: UserBrief | null
  creator?: UserBrief | null
}

export type TaskListResponse = {
  items: Task[]
  total: number
  page: number
  limit: number
  pages: number
}

export type TaskInput = {
  title: string
  description?: string | null
  status: TaskStatus
  priority: TaskPriority
  assigned_to?: string | null
  due_date?: string | null
  clear_assignee?: boolean
  clear_due_date?: boolean
}
