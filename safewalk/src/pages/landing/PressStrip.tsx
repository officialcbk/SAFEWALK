const logos = ['The Globe', 'CBC', 'TechCrunch', 'Wired', 'Refinery29', 'CTV News']

export function PressStrip() {
  return (
    <section className="l-section-sm" style={{ background: '#FAFAFE' }}>
      <div className="l-inner">
        <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, letterSpacing: 1.4, color: '#9090A8', marginBottom: 22 }}>AS SEEN IN</div>
        <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 28, alignItems: 'center' }}>
          {logos.map(l => (
            <div key={l} style={{ fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 600, color: '#9090A8', fontStyle: l === 'Wired' ? 'italic' : 'normal', letterSpacing: l === 'CBC' ? 4 : 0 }}>
              {l}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
