export function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-start justify-center gap-3 px-6">
      <p className="font-display text-sm font-bold tracking-[0.18em] text-[var(--accent)] uppercase">
        Webvory
      </p>
      <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--text)]">
        Webvory Task Hub scaffold
      </h1>
      <p className="text-[var(--text-muted)]">
        Phase 0 frontend is ready. API proxy targets{' '}
        <code className="rounded bg-[var(--surface)] px-1.5 py-0.5 text-sm text-[var(--text)]">/api</code> →{' '}
        <code className="rounded bg-[var(--surface)] px-1.5 py-0.5 text-sm text-[var(--text)]">
          localhost:8000
        </code>
        .
      </p>
    </main>
  )
}
