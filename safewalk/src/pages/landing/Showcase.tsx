import { MarketingPhone } from './MarketingPhone'
import { AppScreenPreview } from './AppScreenPreview'

const screens = [
  { label: 'Map-first home',      screen: 'idle'     },
  { label: 'Active walk',         screen: 'active'   },
  { label: 'Trusted contacts',    screen: 'contacts' },
  { label: 'Walk history',        screen: 'history'  },
  { label: 'Live location share', screen: 'track'    },
] as const

export function Showcase() {
  return (
    <section style={{ padding: '96px 0 80px', background: 'linear-gradient(180deg, white 0%, #EEEDFE 100%)', overflow: 'hidden' }}>
      <div className="l-inner" style={{ padding: '0 28px' }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 48px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.2, color: '#534AB7', marginBottom: 12 }}>YOUR APP</div>
          <h2 className="l-h2">Calm by design.</h2>
          <p style={{ fontSize: 16, color: '#4A4A5A', lineHeight: 1.55, marginTop: 16 }}>
            No clutter. No anxiety-inducing red. Just the things you need, when you need them.
          </p>
        </div>
      </div>

      <div className="l-showcase-scroll">
        {screens.map((s, i) => (
          <div key={i} style={{ scrollSnapAlign: 'center', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <MarketingPhone>
              <AppScreenPreview screen={s.screen}/>
            </MarketingPhone>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#3C3489' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
