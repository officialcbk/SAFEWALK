import { LogoBadge } from './LogoBadge'

const cols = [
  { h: 'Product', items: ['How it works', 'Features', 'Reviews', 'FAQ'] },
  { h: 'Company', items: ['About', 'Press', 'Contact', 'Blog'] },
  { h: 'Legal',   items: ['Privacy policy', 'Terms of service', 'PIPEDA compliance', 'Data deletion'] },
]

export function Footer() {
  return (
    <footer style={{ background: '#1A1A28', color: 'rgba(255,255,255,0.85)', padding: '64px 28px 32px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 48, marginBottom: 48 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <LogoBadge size={28}/>
              <span style={{ fontWeight: 800, fontSize: 17, color: 'white', letterSpacing: -0.4 }}>SafeWalk</span>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, maxWidth: 280 }}>
              Quiet personal safety for everyday walks. Made in Canada with PIPEDA-compliant privacy at its core.
            </p>
          </div>
          {cols.map(c => (
            <div key={c.h}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, color: 'rgba(255,255,255,0.6)', marginBottom: 14 }}>{c.h.toUpperCase()}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {c.items.map(it => (
                  <a key={it} href="#" onClick={e => e.preventDefault()} style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, textDecoration: 'none' }}>{it}</a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
          <div>© 2026 SafeWalk Technologies Inc. · 🍁 Made in Winnipeg, Canada</div>
          <div>v1.0.0 · End-to-end encrypted</div>
        </div>
      </div>
    </footer>
  )
}
