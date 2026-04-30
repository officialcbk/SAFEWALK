import * as Icons from './Icons'

const features = [
  { Icon: Icons.Clock,   title: 'Smart check-ins',      body: "A gentle countdown asks \"are you okay?\" mid-walk. One tap and you're back on your way." },
  { Icon: Icons.Alert,   title: 'Press & hold SOS',     body: '3-second hold prevents accidental triggers. Once active, all contacts get your location instantly.' },
  { Icon: Icons.Users,   title: 'Up to 5 contacts',     body: "Mom, your roommate, your best friend. They don't need the app — just text." },
  { Icon: Icons.History, title: 'Walk history',         body: 'See your routes, durations and check-ins. Auto-deleted after 30 days.' },
  { Icon: Icons.Lock,    title: 'Privacy first',        body: 'Location is only active during walks. We never track you in the background. Ever.' },
  { Icon: Icons.Phone,   title: 'Voice escalation',     body: 'No response? Your primary contact gets a phone call, not just a text.' },
]

export function FeatureGrid() {
  return (
    <section style={{ padding: '96px 28px', background: 'linear-gradient(180deg, #FAFAFE 0%, white 100%)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 56px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.2, color: '#534AB7', marginBottom: 12 }}>FEATURES</div>
          <h2 style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1, margin: 0, lineHeight: 1.1 }}>
            Everything you need.<br/>Nothing you don't.
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
          {features.map((it, i) => (
            <div key={i} style={{ background: 'white', borderRadius: 18, padding: 24, border: '1px solid rgba(127,119,221,0.12)' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: '#EEEDFE',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
              }}>
                <it.Icon size={22} color="#534AB7"/>
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6, letterSpacing: -0.2 }}>{it.title}</div>
              <p style={{ fontSize: 14, color: '#4A4A5A', lineHeight: 1.55, margin: 0 }}>{it.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
