export type UserRole = 'admin' | 'manager' | 'member'

export type User = {
  id: string
  name: string
  email: string
  avatar_url: string | null
  role: UserRole
  job_title: string | null
  reporting_manager_id: string | null
  created_at: string
  last_login_at: string | null
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  skipAuthRedirect?: boolean
}

/** Host prefix from VITE_API_URL (no trailing slash), or empty for same-origin /api. */
const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

/** Resolve an API path. Unset VITE_API_URL → relative `/api/...` (Vite proxy / same host). */
export function apiUrl(path: string): string {
  if (!path.startsWith('/')) {
    throw new Error(`API path must start with /: ${path}`)
  }
  return API_BASE ? `${API_BASE}${path}` : path
}

/** WebSocket URL for an API path (Vite dev proxy does not upgrade WS). */
export function apiWsUrl(path: string): string {
  if (API_BASE) {
    const base = new URL(API_BASE)
    const proto = base.protocol === 'https:' ? 'wss' : 'ws'
    return `${proto}://${base.host}${path}`
  }
  if (import.meta.env.DEV) {
    return `ws://localhost:8000${path}`
  }
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}${path}`
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipAuthRedirect, headers, ...rest } = options
  const res = await fetch(apiUrl(path), {
    ...rest,
    credentials: 'include',
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401 && !skipAuthRedirect) {
    if (!window.location.pathname.startsWith('/login')) {
      window.location.assign('/login')
    }
    throw new ApiError(401, 'Not authenticated')
  }

  if (!res.ok) {
    let message = res.statusText
    try {
      const data = (await res.json()) as { detail?: string }
      if (typeof data.detail === 'string') message = data.detail
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, message)
  }

  if (res.status === 204) {
    return undefined as T
  }

  return (await res.json()) as T
}
