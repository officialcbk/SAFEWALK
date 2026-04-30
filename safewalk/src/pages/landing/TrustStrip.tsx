import * as Icons from './Icons'

export function TrustStrip() {
  return (
    <section style={{ background: 'white', borderTop: '1px solid rgba(127,119,221,0.12)', borderBottom: '1px solid rgba(127,119,221,0.12)' }}>
      <div className="l-inner" style={{ padding: '20px 28px', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 16 }}>
        {[
          { icon: <Icons.Lock size={16} color="#534AB7"/>, label: 'End-to-end encrypted' },
          { icon: <Icons.Shield size={16} color="#534AB7"/>, label: 'PIPEDA compliant' },
          { icon: <Icons.Pin size={16} color="#534AB7"/>, label: 'Location only during walks' },
          { icon: <span style={{ fontSize: 16 }}>🍁</span>, label: 'Made in Canada' },
        ].map((it, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {it.icon}
            <span style={{ fontSize: 13, fontWeight: 600, color: '#3F3F58' }}>{it.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
