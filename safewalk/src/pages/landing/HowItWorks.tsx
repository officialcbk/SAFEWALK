import { IllustrationContacts } from './illustrations/IllustrationContacts'
import { IllustrationCheckin } from './illustrations/IllustrationCheckin'
import { IllustrationSOS } from './illustrations/IllustrationSOS'

const steps = [
  {
    n: 1,
    title: "Add your trusted contacts",
    body: "Pick up to 5 people. They don't need the app — just a phone that gets texts.",
    illu: <IllustrationContacts/>,
  },
  {
    n: 2,
    title: "Start your walk",
    body: "Tell SafeWalk where you're heading. We'll check in on you along the way.",
    illu: <IllustrationCheckin/>,
  },
  {
    n: 3,
    title: "Arrive safe — or get help",
    body: "Tap to confirm you're okay. Miss a check-in or hit SOS, and your contacts get your live location.",
    illu: <IllustrationSOS/>,
  },
]

export function HowItWorks() {
  return (
    <section id="how" style={{ padding: '96px 28px 80px', background: 'white' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 56px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.2, color: '#534AB7', marginBottom: 12 }}>HOW IT WORKS</div>
          <h2 style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1, margin: 0, lineHeight: 1.1 }}>
            Three taps before you head out the door.
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {steps.map(s => (
            <div key={s.n} style={{ background: 'white', borderRadius: 22, border: '1px solid rgba(127,119,221,0.15)', padding: 22, boxShadow: '0 4px 20px rgba(38,33,92,0.04)' }}>
              <div style={{ height: 180, borderRadius: 16, overflow: 'hidden', marginBottom: 18 }}>
                {s.illu}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: '#7F77DD', color: 'white',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 13,
                }}>{s.n}</span>
                <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.3 }}>{s.title}</div>
              </div>
              <p style={{ fontSize: 14, color: '#4A4A5A', lineHeight: 1.55, margin: 0 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
