type View = 'table' | 'kanban' | 'org'

const OPTIONS: { id: View; label: string }[] = [
  { id: 'table', label: 'Table' },
  { id: 'kanban', label: 'Kanban' },
  { id: 'org', label: 'Hierarchy' },
]

export function ViewToggle({
  value,
  onChange,
}: {
  value: View
  onChange: (v: View) => void
}) {
  return (
    <div className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            value === o.id
              ? 'bg-[var(--accent)] text-[#041312]'
              : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export type { View }
