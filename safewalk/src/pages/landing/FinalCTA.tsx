import { useNavigate } from 'react-router-dom'
import * as Icons from './Icons'

export function FinalCTA() {
  const navigate = useNavigate()
  return (
    <section style={{ padding: '88px 28px', background: 'white' }}>
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        background: 'linear-gradient(135deg, #7F77DD, #534AB7 60%, #3C3489)',
        borderRadius: 32, padding: '64px 56px', color: 'white',
        position: 'relative', overflow: 'hidden',
      }}>
        <svg style={{ position: 'absolute', right: -80, top: -80, opacity: 0.18 }} width="380" height="380" viewBox="0 0 380 380">
          <circle cx="190" cy="190" r="180" fill="none" stroke="white" strokeWidth="1.5"/>
          <circle cx="190" cy="190" r="140" fill="none" stroke="white" strokeWidth="1.5"/>
          <circle cx="190" cy="190" r="100" fill="none" stroke="white" strokeWidth="1.5"/>
          <circle cx="190" cy="190" r="60" fill="white" opacity="0.4"/>
        </svg>

        <div style={{ position: 'relative', maxWidth: 600 }}>
          <h2 style={{ fontSize: 48, fontWeight: 800, letterSpacing: -1.2, margin: 0, lineHeight: 1.05 }}>
            Your next walk is in good hands.
          </h2>
          <p style={{ fontSize: 17, opacity: 0.92, marginTop: 18, lineHeight: 1.55 }}>
            Free forever. No credit card. Set up in under two minutes.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/sign-up')} style={{
              background: 'white', color: '#534AB7', height: 56, padding: '0 28px', fontSize: 16, borderRadius: 14,
              fontWeight: 700, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
            }}>
              Try SafeWalk free
              <Icons.Chevron color="#534AB7" size={16}/>
            </button>
            <a href="#how" style={{
              background: 'rgba(255,255,255,0.15)', color: 'white', height: 56, padding: '0 22px', fontSize: 15,
              borderRadius: 14, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.3)',
              display: 'inline-flex', alignItems: 'center', fontWeight: 600,
            }}>
              See how it works
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
