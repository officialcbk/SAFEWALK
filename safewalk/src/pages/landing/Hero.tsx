import { useNavigate } from 'react-router-dom'
import { MarketingPhone } from './MarketingPhone'
import { AppScreenPreview } from './AppScreenPreview'
import * as Icons from './Icons'

const avatars    = ['SJ', 'MC', 'PP', 'DK', 'AL']
const avatarColors = ['#534AB7', '#6B62D4', '#AFA9EC', '#7F77DD', '#3C3489']

export function Hero() {
  const navigate = useNavigate()
  return (
    <section style={{ position: 'relative', overflow: 'hidden' }}>
      {/* bg gradient */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(80% 60% at 80% 0%, rgba(127,119,221,0.20), transparent 60%), radial-gradient(60% 50% at 20% 10%, rgba(175,169,236,0.20), transparent 70%), linear-gradient(180deg,#FFFFFF 0%,#FAFAFE 100%)' }}/>
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.4 }}>
        <defs>
          <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#7F77DD" opacity="0.18"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)"/>
      </svg>

      {/* ── Grid ── */}
      <div className="l-hero-inner">

        {/* Left column */}
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(127,119,221,0.25)', padding: '6px 14px 6px 8px', borderRadius: 999, fontSize: 13, fontWeight: 600, color: '#534AB7', marginBottom: 24 }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#7F77DD', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icons.Shield size={12} color="white"/>
            </span>
            Built for late-night walks home
          </div>

          <h1 className="l-h1">
            Walk home like<br/>
            <span style={{ color: '#534AB7', position: 'relative' }}>
              someone's with you.
              <svg style={{ position: 'absolute', left: 0, right: 0, bottom: -6, width: '100%', height: 14 }} viewBox="0 0 360 14" preserveAspectRatio="none">
                <path d="M2 10 Q 90 2 180 7 T 358 6" stroke="#AFA9EC" strokeWidth="3" fill="none" strokeLinecap="round"/>
              </svg>
            </span>
          </h1>

          <p style={{ fontSize: 18, color: '#4A4A5A', lineHeight: 1.55, marginTop: 22, maxWidth: 480 }}>
            SafeWalk quietly checks in on you while you walk. Miss a check-in, and your trusted contacts get your live location — instantly.
          </p>

          <div style={{ display: 'flex', gap: 12, marginTop: 30, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/onboarding')} style={{ height: 56, padding: '0 26px', fontSize: 16, borderRadius: 14, fontWeight: 700, background: 'linear-gradient(135deg,#7F77DD,#534AB7)', color: 'white', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              Try SafeWalk free
              <Icons.Chevron color="white" size={16}/>
            </button>
            <a href="#how" style={{ height: 56, padding: '0 22px', fontSize: 15, borderRadius: 14, textDecoration: 'none', background: 'white', border: '1px solid rgba(127,119,221,0.25)', color: '#534AB7', display: 'inline-flex', alignItems: 'center', fontWeight: 600 }}>
              See how it works
            </a>
          </div>

          <div style={{ display: 'flex', gap: 20, marginTop: 30, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex' }}>
              {avatars.map((init, idx) => (
                <div key={init} style={{ width: 32, height: 32, borderRadius: '50%', background: avatarColors[idx], color: 'white', fontWeight: 700, fontSize: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', marginLeft: idx === 0 ? 0 : -8 }}>{init}</div>
              ))}
            </div>
            <div>
              <div style={{ display: 'flex', gap: 2, marginBottom: 2, alignItems: 'center' }}>
                {[1,2,3,4,5].map(i => <Icons.Star key={i} size={14} color="#E8A020"/>)}
                <span style={{ fontSize: 13, fontWeight: 700, marginLeft: 4 }}>4.9</span>
              </div>
              <div style={{ fontSize: 12, color: '#6F6F84' }}>from 12,400+ students &amp; solo walkers</div>
            </div>
          </div>
        </div>

        {/* Right column — phone mockup (hidden on tablet/mobile via CSS) */}
        <div className="l-phone-col">
          <div style={{ position: 'absolute', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(127,119,221,0.35), transparent 60%)', filter: 'blur(4px)', top: 80 }}/>
          <MarketingPhone tilt={-3}>
            <AppScreenPreview screen="active"/>
          </MarketingPhone>
          {/* floating chips */}
          <div style={{ position: 'absolute', top: 90, left: -10, background: 'white', borderRadius: 14, padding: '10px 14px', boxShadow: '0 12px 30px rgba(38,33,92,0.14)', display: 'flex', alignItems: 'center', gap: 10, transform: 'rotate(-4deg)' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icons.Check color="#3B6D11" size={16}/>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Check-in confirmed</div>
              <div style={{ fontSize: 10, color: '#6F6F84' }}>Sara · 2 min ago</div>
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: 80, right: -16, background: 'white', borderRadius: 14, padding: '10px 14px', boxShadow: '0 12px 30px rgba(38,33,92,0.14)', display: 'flex', alignItems: 'center', gap: 10, transform: 'rotate(3deg)' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icons.Pin color="#534AB7" size={14}/>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Sharing with 3 contacts</div>
              <div style={{ fontSize: 10, color: '#6F6F84' }}>Live · 0.4 km walked</div>
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}
