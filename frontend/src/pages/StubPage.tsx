export function StubPage({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div>
      <h1 className="page-title">{title}</h1>
      <p className="page-subtitle max-w-xl">{blurb}</p>
    </div>
  )
}
