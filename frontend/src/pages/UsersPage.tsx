import { useEffect, useState } from 'react'
import { api } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { EmptyState, LoadingSpinner, Select, Table } from '@/components/ui'
import type { User, UserRole } from '@/services/api'

export function UsersPage() {
  const { user, refresh } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      setUsers(await api<User[]>('/api/users'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function changeRole(id: string, role: UserRole) {
    try {
      setError(null)
      await api(`/api/users/${id}/role`, { method: 'PATCH', body: { role } })
      await load()
      if (user?.id === id) {
        await refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Role update failed')
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Team</h1>
        <p className="page-subtitle">OAuth-provisioned teammates.</p>
      </div>
      {error ? <p className="alert-error">{error}</p> : null}
      {!users.length ? (
        <EmptyState title="No teammates yet" description="Share the login link after Google OAuth is configured." />
      ) : (
        <Table>
          <thead className="bg-[var(--bg-elevated)] text-xs tracking-wide text-[var(--text-muted)] uppercase">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-[var(--border-subtle)]">
                <td className="px-4 py-3 font-medium text-[var(--text)]">{u.name}</td>
                <td className="px-4 py-3 text-[var(--text-muted)]">{u.email}</td>
                <td className="px-4 py-3">
                  <Select
                    value={u.role}
                    onChange={(e) => void changeRole(u.id, e.target.value as UserRole)}
                    aria-label={`Role for ${u.name}`}
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="member">Member</option>
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  )
}
