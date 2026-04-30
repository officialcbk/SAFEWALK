import { useState } from 'react'
import * as Icons from './Icons'

const faqs = [
  { q: 'Is SafeWalk free?',                 a: 'Yes. The core experience — check-ins, SOS, up to 5 contacts, walk history — is completely free, with no ads.' },
  { q: 'Do my contacts need the app?',       a: 'No. They only need a phone that receives text messages. They get a private link with your live location during an emergency.' },
  { q: 'Are you tracking me all the time?',  a: 'No. Location is only collected while a walk is active and is automatically deleted after 30 days. We never run in the background.' },
  { q: 'What happens if I miss a check-in?', a: "You get 90 seconds to respond. If you don't, all your contacts receive an SMS with your live location, and your primary contact also gets a phone call." },
  { q: 'Will it call 911 automatically?',    a: 'No. SafeWalk shows a one-tap option to call 911 yourself, but never calls them on your behalf without your action.' },
  { q: 'Is my data sold to anyone?',         a: 'No. Ever. We are PIPEDA compliant and your walk history is yours alone. You can export or delete it anytime.' },
]

export function FAQ() {
  const [open, setOpen] = useState<number>(0)
  return (
    <section id="faq" className="l-section" style={{ background: '#FAFAFE' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.2, color: '#534AB7', marginBottom: 12 }}>FAQ</div>
          <h2 className="l-h2">Questions, answered.</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {faqs.map((it, i) => {
            const isOpen = open === i
            return (
              <div key={i} onClick={() => setOpen(isOpen ? -1 : i)} style={{ background: 'white', borderRadius: 14, padding: '18px 22px', cursor: 'pointer', border: isOpen ? '1px solid #7F77DD' : '1px solid rgba(127,119,221,0.12)', transition: 'border-color .15s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.2 }}>{it.q}</div>
                  <Icons.Chevron color="#534AB7" dir={isOpen ? 'down' : 'right'}/>
                </div>
                {isOpen && (
                  <div style={{ fontSize: 14, color: '#4A4A5A', lineHeight: 1.6, marginTop: 12 }}>{it.a}</div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
