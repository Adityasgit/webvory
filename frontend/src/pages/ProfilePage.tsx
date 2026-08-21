import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Button, Select } from '@/components/ui'
import { api, type UserRole } from '@/services/api'

export function ProfilePage() {
  const { user, logout, refresh } = useAuth()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function changeRole(role: UserRole) {
    if (!user || role === user.role) return
    setSaving(true)
    setError(null)
    try {
      await api(`/api/users/${user.id}/role`, { method: 'PATCH', body: { role } })
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Role update failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <h1 className="page-title">Profile</h1>
        <p className="page-subtitle">Your Google identity and account role.</p>
      </div>
      <div className="surface space-y-4 p-5">
        {user?.avatar_url ? (
          <img
            src={user.avatar_url}
            alt=""
            className="h-16 w-16 rounded-full border border-[var(--border)]"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-soft)] font-display text-xl font-bold text-[var(--accent)]">
            {(user?.name ?? '?').slice(0, 1).toUpperCase()}
          </div>
        )}
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-xs tracking-wide text-[var(--text-muted)] uppercase">Name</dt>
            <dd className="mt-0.5 font-medium text-[var(--text)]">{user?.name}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-[var(--text-muted)] uppercase">Email</dt>
            <dd className="mt-0.5 font-medium text-[var(--text)]">{user?.email}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-[var(--text-muted)] uppercase">Role</dt>
            <dd className="mt-1">
              <Select
                value={user?.role ?? 'member'}
                disabled={saving || !user}
                onChange={(e) => void changeRole(e.target.value as UserRole)}
                aria-label="Your role"
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="member">Member</option>
              </Select>
            </dd>
          </div>
        </dl>
        {error ? <p className="alert-error">{error}</p> : null}
        <Button type="button" variant="secondary" onClick={() => void logout()}>
          Log out
        </Button>
      </div>
    </div>
  )
}
