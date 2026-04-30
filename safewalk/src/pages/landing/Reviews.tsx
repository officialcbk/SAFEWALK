import * as Icons from './Icons'

const reviews = [
  { name: 'Maya R.',   who: 'McGill University · Montréal',  initials: 'MR', color: '#534AB7', stars: 5, text: 'I use it every Friday after my late shift. Knowing my roommate gets pinged if I miss a check-in is genuinely calming.' },
  { name: 'Daniel O.', who: 'UBC · Vancouver',               initials: 'DO', color: '#6B62D4', stars: 5, text: 'My mom finally stopped asking me to text her every five minutes. SafeWalk does it for me, automatically.' },
  { name: 'Aisha K.',  who: 'U of T · Toronto',              initials: 'AK', color: '#7F77DD', stars: 5, text: "The press-and-hold SOS is brilliant. I used to be terrified of butt-dialing 911. This actually feels safe to keep on." },
  { name: 'Sara J.',   who: 'Mom of a Western U student',    initials: 'SJ', color: '#AFA9EC', stars: 5, text: "I get a text the moment her walk starts and another when she's home. It's become a tiny ritual that means everything." },
  { name: 'Chen L.',   who: 'McMaster · Hamilton',           initials: 'CL', color: '#3C3489', stars: 5, text: 'Walked home from the lab at 2 AM during finals. Check-ins kept me alert AND made me feel less alone.' },
  { name: 'Priya P.',  who: 'University of Manitoba',        initials: 'PP', color: '#534AB7', stars: 5, text: 'No subscription, no ads, no creepy data harvesting. It does one thing really well and respects me.' },
  { name: 'Jamie T.',  who: 'Dalhousie · Halifax',           initials: 'JT', color: '#6B62D4', stars: 5, text: 'I work nights. SafeWalk turned my walk to the bus stop from a daily anxiety spike into a non-event.' },
]

export function Reviews() {
  return (
    <section id="reviews" className="l-section" style={{ background: 'white' }}>
      <div className="l-inner">
        <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 56px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.2, color: '#534AB7', marginBottom: 12 }}>REVIEWS</div>
          <h2 className="l-h2">Real walks. Real peace of mind.</h2>
        </div>

        <div className="l-reviews">
          {reviews.map((r, i) => (
            <div key={i} style={{ breakInside: 'avoid', marginBottom: 18, background: '#FAFAFE', border: '1px solid rgba(127,119,221,0.15)', borderRadius: 18, padding: 22 }}>
              <div style={{ display: 'flex', gap: 2, marginBottom: 10 }}>
                {Array.from({ length: r.stars }).map((_, j) => <Icons.Star key={j} size={14} color="#E8A020"/>)}
              </div>
              <p style={{ fontSize: 15, lineHeight: 1.55, color: '#1A1A28', margin: 0, marginBottom: 16 }}>"{r.text}"</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: r.color, color: 'white', fontWeight: 700, fontSize: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {r.initials}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: '#6F6F84' }}>{r.who}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
