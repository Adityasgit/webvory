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

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipAuthRedirect, headers, ...rest } = options
  const res = await fetch(path, {
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
