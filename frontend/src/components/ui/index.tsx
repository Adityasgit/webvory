import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
}) {
  const styles = {
    primary:
      'bg-[var(--accent)] text-[#041312] hover:bg-[var(--accent-strong)] shadow-[0_0_0_1px_rgba(46,196,182,0.25)]',
    secondary:
      'border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-hover)]',
    danger: 'bg-[var(--danger)] text-[#1a0506] hover:brightness-110',
    ghost: 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]',
  }[variant]
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-50 ${styles} ${className}`}
      {...props}
    />
  )
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--focus-ring)] ${className}`}
      {...props}
    />
  )
}

export function TextArea({
  className = '',
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--focus-ring)] ${className}`}
      {...props}
    />
  )
}

export function Select({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--focus-ring)] ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1 block text-xs font-medium tracking-wide text-[var(--text-muted)] uppercase"
    >
      {children}
    </label>
  )
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
          <h2 className="font-display text-lg font-semibold tracking-tight text-[var(--text)]">{title}</h2>
          <Button variant="ghost" type="button" onClick={onClose} aria-label="Close dialog">
            ✕
          </Button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] px-5 py-4">{footer}</div>
        ) : null}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onClose,
  loading,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onClose: () => void
  loading?: boolean
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" type="button" onClick={onConfirm} disabled={loading}>
            {loading ? 'Working…' : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-[var(--text-muted)]">{message}</p>
    </Modal>
  )
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <table className="min-w-full text-left text-sm">{children}</table>
    </div>
  )
}

export function Pagination({
  page,
  pages,
  total,
  onPageChange,
}: {
  page: number
  pages: number
  total: number
  onPageChange: (page: number) => void
}) {
  if (pages <= 1) {
    return <p className="text-xs text-[var(--text-muted)]">{total} result{total === 1 ? '' : 's'}</p>
  }
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <p className="text-[var(--text-muted)]">
        Page {page} of {pages} · {total} total
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <Button variant="secondary" type="button" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-[var(--status-pending-bg)] text-[var(--status-pending-fg)]',
    in_progress: 'bg-[var(--status-progress-bg)] text-[var(--status-progress-fg)]',
    completed: 'bg-[var(--status-done-bg)] text-[var(--status-done-fg)]',
    blocked: 'bg-[var(--status-blocked-bg)] text-[var(--status-blocked-fg)]',
  }
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium capitalize ${map[status] ?? 'bg-[var(--status-pending-bg)] text-[var(--status-pending-fg)]'}`}
    >
      {status.replace('_', ' ')}
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    low: 'bg-[var(--priority-low-bg)] text-[var(--priority-low-fg)]',
    medium: 'bg-[var(--priority-med-bg)] text-[var(--priority-med-fg)]',
    high: 'bg-[var(--priority-high-bg)] text-[var(--priority-high-fg)]',
    urgent: 'bg-[var(--priority-urgent-bg)] text-[var(--priority-urgent-fg)]',
  }
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium capitalize ${map[priority] ?? 'bg-[var(--priority-low-bg)] text-[var(--priority-low-fg)]'}`}
    >
      {priority}
    </span>
  )
}

export function TaskCard({
  title,
  status,
  priority,
  assignee,
  dueDate,
  onClick,
}: {
  title: string
  status: string
  priority: string
  assignee?: string | null
  dueDate?: string | null
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition hover:border-[var(--accent)]/40 hover:bg-[var(--surface-hover)]"
    >
      <div className="mb-2 flex flex-wrap gap-2">
        <StatusBadge status={status} />
        <PriorityBadge priority={priority} />
      </div>
      <p className="font-medium text-[var(--text)]">{title}</p>
      <p className="mt-2 text-xs text-[var(--text-muted)]">
        {assignee ?? 'Unassigned'}
        {dueDate ? ` · due ${dueDate}` : ''}
      </p>
    </button>
  )
}

export function LoadingSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-[var(--text-muted)]">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
      {label}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)]/60 px-6 py-14 text-center">
      <h3 className="font-display text-base font-semibold text-[var(--text)]">{title}</h3>
      {description ? <p className="mt-2 text-sm text-[var(--text-muted)]">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}
