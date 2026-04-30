const items = [
  { n: '142k', l: 'walks completed' },
  { n: '38k',  l: 'students protected' },
  { n: '4.9★', l: 'average rating' },
  { n: '0',    l: 'data sold to advertisers' },
]

export function Stats() {
  return (
    <section className="l-section-sm" style={{ background: 'linear-gradient(135deg, #534AB7, #3C3489)', color: 'white' }}>
      <div className="l-stats-grid l-inner">
        {items.map((it, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div className="l-stat-num">{it.n}</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 8, fontWeight: 500 }}>{it.l}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
