const items = [
  { n: '142k', l: 'walks completed' },
  { n: '38k',  l: 'students protected' },
  { n: '4.9★', l: 'average rating' },
  { n: '0',    l: 'data sold to advertisers' },
]

export function Stats() {
  return (
    <section style={{ padding: '64px 28px', background: 'linear-gradient(135deg, #534AB7, #3C3489)', color: 'white' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
        {items.map((it, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1 }}>{it.n}</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 8, fontWeight: 500 }}>{it.l}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
