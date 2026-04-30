import { useNavigate } from 'react-router-dom'
import { LogoBadge } from './LogoBadge'

const navLink: React.CSSProperties = { color: '#3F3F58', fontSize: 14, fontWeight: 500, textDecoration: 'none', cursor: 'pointer' }

export function LandingNav() {
  const navigate = useNavigate()
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(127,119,221,0.12)',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 32 }}>
        <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <LogoBadge size={28}/>
          <span style={{ fontWeight: 800, fontSize: 17, color: '#1A1A28', letterSpacing: -0.4 }}>SafeWalk</span>
        </a>
        <div style={{ display: 'flex', gap: 26, marginLeft: 16 }}>
          <a href="#how" style={navLink}>How it works</a>
          <a href="#reviews" style={navLink}>Reviews</a>
          <a href="#faq" style={navLink}>FAQ</a>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={() => navigate('/sign-in')} style={{ ...navLink, background: 'none', border: 'none', fontWeight: 600 }}>Sign in</button>
          <button onClick={() => navigate('/sign-up')} style={{
            height: 42, padding: '0 18px', fontSize: 14, borderRadius: 999, fontWeight: 700,
            background: 'linear-gradient(135deg,#7F77DD,#534AB7)', color: 'white', border: 'none', cursor: 'pointer',
          }}>
            Try SafeWalk free
          </button>
        </div>
      </div>
    </nav>
  )
}
