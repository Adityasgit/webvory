import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, EmptyState, LoadingSpinner, Select, Table } from '@/components/ui'
import { api } from '@/services/api'
import { useAuth } from '@/context/AuthContext'

export type OrgMember = {
  id: string
  name: string
  email: string
  role: string
  job_title: string | null
  reporting_manager_id: string | null
  manager_name: string | null
  direct_reports_count: number
  open_tasks_count: number
}

export function OrganisationTable({ search }: { search: string }) {
  const { user } = useAuth()
  const [members, setMembers] = useState<OrgMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Demo: any logged-in user can reassign managers.
  const canManage = Boolean(user)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setMembers(await api<OrgMember[]>('/api/organization/members'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function setManager(userId: string, managerId: string) {
    try {
      await api(`/api/users/${userId}/manager`, {
        method: 'PATCH',
        body: { manager_id: managerId || null },
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update manager')
    }
  }

  const filtered = members.filter((m) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      (m.job_title ?? '').toLowerCase().includes(q)
    )
  })

  if (loading) return <LoadingSpinner />
  if (error) return <p className="alert-error">{error}</p>
  if (!filtered.length) return <EmptyState title="No teammates match" />

  return (
    <Table>
      <thead className="bg-[var(--bg-elevated)] text-xs tracking-wide text-[var(--text-muted)] uppercase">
        <tr>
          <th className="px-4 py-3">Name</th>
          <th className="px-4 py-3">Role</th>
          <th className="px-4 py-3">Manager</th>
          <th className="px-4 py-3">Reports</th>
          <th className="px-4 py-3">Open tasks</th>
          <th className="px-4 py-3" />
        </tr>
      </thead>
      <tbody>
        {filtered.map((m) => (
          <tr key={m.id} className="border-t border-[var(--border-subtle)]">
            <td className="px-4 py-3">
              <p className="font-medium text-[var(--text)]">{m.name}</p>
              <p className="text-xs text-[var(--text-muted)]">{m.email}</p>
            </td>
            <td className="px-4 py-3 capitalize text-[var(--text-muted)]">{m.role}</td>
            <td className="px-4 py-3">
              {canManage ? (
                <Select
                  value={m.reporting_manager_id ?? ''}
                  onChange={(e) => void setManager(m.id, e.target.value)}
                >
                  <option value="">Root —</option>
                  {members
                    .filter((x) => x.id !== m.id)
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                </Select>
              ) : (
                <span className="text-[var(--text-muted)]">{m.manager_name ?? '—'}</span>
              )}
            </td>
            <td className="px-4 py-3 text-[var(--text)]">{m.direct_reports_count}</td>
            <td className="px-4 py-3 text-[var(--text)]">{m.open_tasks_count}</td>
            <td className="px-4 py-3 text-right">
              <Link to={`/tasks?assignee=${m.id}`}>
                <Button variant="ghost" type="button">
                  Tasks
                </Button>
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}
