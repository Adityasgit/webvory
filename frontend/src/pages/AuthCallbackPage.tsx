import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { setToken } from '@/services/api'

export function AuthCallbackPage() {
  const { user, loading, refresh } = useAuth()
  const [handled, setHandled] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (!token) {
      setHandled(true)
      return
    }

    setToken(token)
    window.history.replaceState({}, '', '/auth/callback')
    void refresh().finally(() => setHandled(true))
  }, [refresh])

  if (!handled || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--text-muted)]">
        Signing you in…
      </div>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return <Navigate to="/login?error=login_failed" replace />
}
