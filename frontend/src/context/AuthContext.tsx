import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, ApiError, type User } from '@/services/api'

type AuthContextValue = {
  user: User | null
  loading: boolean
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const loadMe = async () => api<User>('/api/auth/me', { skipAuthRedirect: true })

    try {
      setUser(await loadMe())
    } catch (err) {
      // One retry after OAuth redirect while the partitioned session cookie commits.
      if (err instanceof ApiError && err.status === 401) {
        await new Promise((resolve) => setTimeout(resolve, 400))
        try {
          setUser(await loadMe())
          return
        } catch {
          /* fall through */
        }
      }
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const logout = useCallback(async () => {
    try {
      await api<void>('/api/auth/logout', { method: 'POST', skipAuthRedirect: true })
    } finally {
      setUser(null)
      window.location.assign('/login')
    }
  }, [])

  const value = useMemo(
    () => ({ user, loading, refresh, logout }),
    [user, loading, refresh, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
