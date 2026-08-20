export function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-start justify-center gap-3 px-6">
      <p className="text-sm font-medium tracking-wide text-teal-700">Webvory</p>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
        Webvory Task Hub — scaffold
      </h1>
      <p className="text-slate-600">
        Phase 0 frontend is ready. API proxy targets{' '}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">/api</code> →{' '}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">localhost:8000</code>.
      </p>
    </main>
  )
}
