const logos = ['The Globe', 'CBC', 'TechCrunch', 'Wired', 'Refinery29', 'CTV News']

export function PressStrip() {
  return (
    <section style={{ background: '#FAFAFE', padding: '36px 28px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, letterSpacing: 1.4, color: '#9090A8', marginBottom: 22 }}>AS SEEN IN</div>
        <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 28, alignItems: 'center' }}>
          {logos.map(l => (
            <div key={l} style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 600, color: '#9090A8', fontStyle: l === 'Wired' ? 'italic' : 'normal', letterSpacing: l === 'CBC' ? 4 : 0 }}>{l}</div>
          ))}
        </div>
      </div>
    </section>
  )
}
