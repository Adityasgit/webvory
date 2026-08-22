import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui'
import { NotificationDrawer } from '@/components/NotificationDrawer'
import { api, apiWsUrl } from '@/services/api'

type NavItem = {
  to: string
  label: string
  icon: ReactNode
}

const iconClass = 'h-[1.35rem] w-[1.35rem] shrink-0'

function IconDashboard() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <rect x="13" y="3.5" width="7.5" height="5" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <rect x="13" y="11" width="7.5" height="9.5" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <rect x="3.5" y="13.5" width="7.5" height="7" rx="2" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}

function IconTasks() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8.5 6.5h10M8.5 12h10M8.5 17.5h10"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M4.5 6.5l1 1 2-2.5M4.5 12l1 1 2-2.5M4.5 17.5l1 1 2-2.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconTeam() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="16.5" cy="9" r="2" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M4.5 18.5c.4-2.6 2.5-4 4.5-4s4.1 1.4 4.5 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M14 14.5c1.5.15 3.1 1.1 3.6 3.2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconProfile() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="9" r="3.25" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M5.5 19c1.1-3.1 3.2-4.5 6.5-4.5s5.4 1.4 6.5 4.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconBell() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4.5a5 5 0 0 1 5 5v2.1c0 .7.2 1.4.6 2l1.1 1.5c.5.7 0 1.7-.9 1.7H6.2c-.9 0-1.4-1-.9-1.7l1.1-1.5c.4-.6.6-1.3.6-2V9.5a5 5 0 0 1 5-5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M10 19.2a2.2 2.2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

const nav: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <IconDashboard /> },
  { to: '/tasks', label: 'Tasks', icon: <IconTasks /> },
  { to: '/users', label: 'Team', icon: <IconTeam /> },
]

function BrandMark({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect width="36" height="36" rx="12" fill="var(--accent-soft)" />
      <path
        d="M8 24.5V11.5h3.2l3.55 8.35L18.3 11.5H21.5l3.55 8.35L28.6 11.5H31.8V24.5h-2.85v-7.4l-3.2 7.4h-2.7l-3.2-7.4v7.4H17.1l-3.2-7.4v7.4H8Z"
        fill="var(--accent)"
      />
      <path d="M8 27.5h20" stroke="var(--accent)" strokeWidth="1.75" strokeLinecap="round" opacity="0.45" />
    </svg>
  )
}

function initials(name?: string) {
  if (!name?.trim()) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

function navLinkClass(isActive: boolean) {
  return [
    'flex w-full flex-col items-center gap-1 rounded-[1rem] px-2 py-2.5 text-center transition',
    isActive
      ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
      : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]',
  ].join(' ')
}

export function AppShell() {
  const { user, logout } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    void api<{ id: string; is_read: boolean }[]>('/api/notifications')
      .then((list) => setUnread(list.filter((n) => !n.is_read).length))
      .catch(() => setUnread(0))

    const wsUrl = apiWsUrl('/api/ws')
    let ws: WebSocket | null = null
    try {
      ws = new WebSocket(wsUrl)
      ws.onmessage = () => {
        void api<{ id: string; is_read: boolean }[]>('/api/notifications')
          .then((list) => setUnread(list.filter((n) => !n.is_read).length))
          .catch(() => undefined)
      }
    } catch {
      /* ignore */
    }
    return () => ws?.close()
  }, [])

  return (
    <div className="shell-page text-[var(--text)]">
      <div className="shell-frame mx-auto flex h-full w-full max-w-[1440px] overflow-hidden">
        {/* Desktop icon rail — full shell height, does not scroll */}
        <aside className="shell-rail hidden h-full w-[4.75rem] shrink-0 flex-col items-center px-2 py-5 md:flex">
          <div className="mb-6 flex flex-col items-center gap-1.5">
            <BrandMark className="h-9 w-9" />
            <span className="font-display text-[0.65rem] font-bold tracking-wide text-[var(--text-muted)]">
              WV
            </span>
          </div>

          <nav className="flex w-full flex-1 flex-col items-center gap-1.5">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                title={item.label}
                className={({ isActive }) => navLinkClass(isActive)}
              >
                {item.icon}
                <span className="text-[0.65rem] font-semibold leading-none tracking-wide">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="mt-4 flex w-full flex-col items-center gap-2">
            <NavLink to="/profile" title="Profile" className={({ isActive }) => navLinkClass(isActive)}>
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt=""
                  className="h-7 w-7 rounded-full object-cover ring-1 ring-[var(--border)]"
                />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-soft)] font-display text-[0.65rem] font-bold text-[var(--accent)]">
                  {initials(user?.name)}
                </span>
              )}
              <span className="text-[0.65rem] font-semibold leading-none tracking-wide">You</span>
            </NavLink>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-full px-2 py-1 text-[0.6rem] font-medium text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
            >
              Log out
            </button>
          </div>
        </aside>

        {/* Main column: header chrome outside rounded Outlet panel */}
        <div className="shell-main flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <header className="shell-header flex shrink-0 items-center justify-between gap-3 px-4 py-3 md:px-5 md:py-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex items-center gap-2 md:hidden">
                <BrandMark className="h-8 w-8" />
                <div className="min-w-0 leading-tight">
                  <p className="font-display text-sm font-bold tracking-tight">Webvory</p>
                  <p className="text-[0.65rem] text-[var(--text-muted)]">Task Hub</p>
                </div>
              </div>
              <div className="hidden min-w-0 md:block">
                <p className="truncate text-sm font-medium text-[var(--text)]">{user?.name}</p>
                <p className="truncate text-xs text-[var(--text-muted)]">{user?.email}</p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="secondary"
                type="button"
                className="shell-header-pill gap-2 rounded-full px-3.5"
                onClick={() => setDrawerOpen(true)}
              >
                <IconBell />
                <span>Alerts{unread ? ` (${unread})` : ''}</span>
              </Button>
              <Button
                variant="ghost"
                type="button"
                className="rounded-full md:hidden"
                onClick={() => void logout()}
              >
                Log out
              </Button>
            </div>
          </header>

          {/* Mobile nav pills — chrome, not inside rounded panel */}
          <div className="shell-mobile-nav flex shrink-0 gap-1.5 overflow-x-auto px-4 pb-3 md:hidden">
            {[...nav, { to: '/profile', label: 'Profile', icon: <IconProfile /> }].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition',
                    isActive
                      ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                      : 'bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]',
                  ].join(' ')
                }
              >
                <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="shell-viewport flex min-h-0 flex-1 flex-col overflow-hidden">
            <main className="shell-content min-h-0 flex-1 overflow-y-auto px-4 pb-5 pt-3 md:px-6 md:pb-6 md:pt-4">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
      <NotificationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}
