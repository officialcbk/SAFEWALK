// SafeWalk landing page — illustrations + components
// Loads after primitives.jsx so it can use Icon, Logo, MapCanvas, etc.

const { useState: useStateL, useEffect: useEffectL, useRef: useRefL } = React;

// ───────────────────────────────────────────────────────────
// Phone mockup (smaller, marketing-friendly)
// ───────────────────────────────────────────────────────────
function MarketingPhone({ children, scale = 1, tilt = 0 }) {
  return (
    <div style={{
      width: 320, height: 680,
      borderRadius: 46, background: '#0E0E18', padding: 10,
      boxShadow: '0 30px 80px rgba(38,33,92,0.25), 0 8px 24px rgba(38,33,92,0.18), inset 0 0 0 1px rgba(255,255,255,0.05)',
      position: 'relative', transform: `scale(${scale}) rotate(${tilt}deg)`, transformOrigin: 'center',
    }}>
      <div style={{
        position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
        width: 100, height: 28, background: '#000', borderRadius: 999, zIndex: 30,
      }}/>
      <div style={{
        width: '100%', height: '100%', borderRadius: 36, overflow: 'hidden',
        background: '#fff', position: 'relative', display: 'flex', flexDirection: 'column',
      }}>
        {children}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// SVG illustrations (brand purple)
// ───────────────────────────────────────────────────────────
function IllustrationCheckin() {
  return (
    <svg viewBox="0 0 240 200" width="100%" height="100%">
      <defs>
        <linearGradient id="ill1bg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#EEEDFE"/><stop offset="1" stopColor="#DCD9FB"/>
        </linearGradient>
      </defs>
      <rect width="240" height="200" fill="url(#ill1bg)" rx="20"/>
      {/* concentric */}
      <circle cx="120" cy="100" r="74" fill="none" stroke="#AFA9EC" strokeWidth="1.5" opacity="0.7"/>
      <circle cx="120" cy="100" r="54" fill="none" stroke="#AFA9EC" strokeWidth="1.5"/>
      <circle cx="120" cy="100" r="34" fill="#7F77DD" opacity="0.18"/>
      {/* clock card */}
      <g transform="translate(120 100)">
        <rect x="-44" y="-30" width="88" height="60" rx="14" fill="white" stroke="#AFA9EC" strokeWidth="1"/>
        <circle cx="-22" cy="0" r="14" fill="none" stroke="#6B62D4" strokeWidth="2"/>
        <path d="M-22 -8 V 0 L -16 4" stroke="#6B62D4" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <rect x="-2" y="-7" width="38" height="4" rx="2" fill="#6B62D4"/>
        <rect x="-2" y="1" width="26" height="4" rx="2" fill="#AFA9EC"/>
      </g>
    </svg>
  );
}
function IllustrationSOS() {
  return (
    <svg viewBox="0 0 240 200" width="100%" height="100%">
      <defs>
        <linearGradient id="ill2bg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#FCEBEB"/><stop offset="1" stopColor="#FAEEDA"/>
        </linearGradient>
      </defs>
      <rect width="240" height="200" fill="url(#ill2bg)" rx="20"/>
      <circle cx="120" cy="100" r="68" fill="none" stroke="#E24B4A" strokeWidth="1.5" opacity="0.4"/>
      <circle cx="120" cy="100" r="50" fill="none" stroke="#E24B4A" strokeWidth="1.5" opacity="0.6"/>
      <circle cx="120" cy="100" r="34" fill="#E24B4A"/>
      <text x="120" y="108" textAnchor="middle" fontFamily="Inter" fontWeight="800" fontSize="18" fill="white" letterSpacing="2">SOS</text>
    </svg>
  );
}
function IllustrationContacts() {
  return (
    <svg viewBox="0 0 240 200" width="100%" height="100%">
      <defs>
        <linearGradient id="ill3bg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#EEEDFE"/><stop offset="1" stopColor="#DCD9FB"/>
        </linearGradient>
      </defs>
      <rect width="240" height="200" fill="url(#ill3bg)" rx="20"/>
      {/* central */}
      <circle cx="120" cy="100" r="22" fill="#7F77DD"/>
      <text x="120" y="106" textAnchor="middle" fontFamily="Inter" fontWeight="700" fontSize="14" fill="white">AJ</text>
      {/* contacts */}
      {[
        { x: 60, y: 60, l: 'SJ', c: '#534AB7' },
        { x: 180, y: 60, l: 'MC', c: '#6B62D4' },
        { x: 60, y: 140, l: 'PP', c: '#AFA9EC' },
        { x: 180, y: 140, l: 'DK', c: '#7F77DD' },
      ].map((c, i) => (
        <g key={i}>
          <line x1="120" y1="100" x2={c.x} y2={c.y} stroke="#AFA9EC" strokeWidth="1.5" strokeDasharray="3 3"/>
          <circle cx={c.x} cy={c.y} r="18" fill="white" stroke={c.c} strokeWidth="2"/>
          <text x={c.x} y={c.y+5} textAnchor="middle" fontFamily="Inter" fontWeight="700" fontSize="11" fill={c.c}>{c.l}</text>
        </g>
      ))}
    </svg>
  );
}
function IllustrationPrivacy() {
  return (
    <svg viewBox="0 0 240 200" width="100%" height="100%">
      <defs>
        <linearGradient id="ill4bg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#EAF3DE"/><stop offset="1" stopColor="#DCD9FB"/>
        </linearGradient>
      </defs>
      <rect width="240" height="200" fill="url(#ill4bg)" rx="20"/>
      <path d="M120 50 L 170 70 V 110 C 170 138 145 154 120 162 C 95 154 70 138 70 110 V 70 Z"
            fill="white" stroke="#6B62D4" strokeWidth="2"/>
      <path d="M100 102 L 116 118 L 144 90" stroke="#3B6D11" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IllustrationHistory() {
  return (
    <svg viewBox="0 0 240 200" width="100%" height="100%">
      <defs>
        <linearGradient id="ill5bg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#EEEDFE"/><stop offset="1" stopColor="#DCD9FB"/>
        </linearGradient>
      </defs>
      <rect width="240" height="200" fill="url(#ill5bg)" rx="20"/>
      <rect x="40" y="50" width="160" height="20" rx="6" fill="white"/>
      <rect x="46" y="56" width="36" height="8" rx="3" fill="#7F77DD"/>
      <rect x="40" y="80" width="160" height="20" rx="6" fill="white"/>
      <rect x="46" y="86" width="60" height="8" rx="3" fill="#AFA9EC"/>
      <rect x="40" y="110" width="160" height="20" rx="6" fill="white"/>
      <rect x="46" y="116" width="48" height="8" rx="3" fill="#7F77DD"/>
      <rect x="40" y="140" width="160" height="20" rx="6" fill="white"/>
      <rect x="46" y="146" width="80" height="8" rx="3" fill="#AFA9EC"/>
    </svg>
  );
}
function IllustrationStudent() {
  return (
    <svg viewBox="0 0 240 200" width="100%" height="100%">
      <defs>
        <linearGradient id="ill6bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#3C3489"/><stop offset="1" stopColor="#26215C"/>
        </linearGradient>
      </defs>
      <rect width="240" height="200" fill="url(#ill6bg)" rx="20"/>
      {/* moon */}
      <circle cx="190" cy="40" r="14" fill="#FAEEDA"/>
      <circle cx="183" cy="38" r="14" fill="url(#ill6bg)"/>
      {/* stars */}
      {[[40,30],[80,20],[150,18],[210,80]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="1.5" fill="#EEEDFE" opacity="0.8"/>
      ))}
      {/* path */}
      <path d="M0 170 Q 60 150 120 160 T 240 150" stroke="#7F77DD" strokeWidth="3" fill="none" strokeDasharray="6 6"/>
      {/* walker */}
      <g transform="translate(108 110)">
        <circle cx="0" cy="0" r="7" fill="#FAEEDA"/>
        <rect x="-5" y="6" width="10" height="22" rx="3" fill="#7F77DD"/>
        <rect x="-3" y="26" width="3" height="14" rx="1" fill="#3C3489"/>
        <rect x="2" y="26" width="3" height="14" rx="1" fill="#3C3489"/>
        <rect x="-12" y="14" width="6" height="3" rx="1" fill="#7F77DD" transform="rotate(-30)"/>
      </g>
      {/* halo */}
      <circle cx="108" cy="110" r="50" fill="none" stroke="#AFA9EC" strokeWidth="1" opacity="0.5"/>
      <circle cx="108" cy="110" r="35" fill="none" stroke="#AFA9EC" strokeWidth="1" opacity="0.7"/>
    </svg>
  );
}

// ───────────────────────────────────────────────────────────
// Marketing primitives
// ───────────────────────────────────────────────────────────
function NavBar({ onCTA, onSignIn }) {
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(127,119,221,0.12)',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 32 }}>
        <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <Logo size="sm"/>
          <span style={{ fontWeight: 800, fontSize: 17, color: 'var(--dark)', letterSpacing: -0.4 }}>SafeWalk</span>
        </a>
        <div style={{ display: 'flex', gap: 26, marginLeft: 16 }}>
          <a href="#how" style={navLink}>How it works</a>
          <a href="#reviews" style={navLink}>Reviews</a>
          <a href="#faq" style={navLink}>FAQ</a>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <a href="SafeWalk.html" onClick={onSignIn} style={{ ...navLink, fontWeight: 600 }}>Sign in</a>
          <button onClick={onCTA} className="sw-btn sw-btn-primary" style={{ height: 42, padding: '0 18px', fontSize: 14, borderRadius: 999 }}>
            Try SafeWalk free
          </button>
        </div>
      </div>
    </nav>
  );
}
const navLink = { color: '#3F3F58', fontSize: 14, fontWeight: 500, textDecoration: 'none', cursor: 'pointer' };

// ───────────────────────────────────────────────────────────
// Hero
// ───────────────────────────────────────────────────────────
function Hero({ onCTA }) {
  return (
    <section style={{ position: 'relative', overflow: 'hidden' }}>
      {/* soft background */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(80% 60% at 80% 0%, rgba(127,119,221,0.20), transparent 60%), radial-gradient(60% 50% at 20% 10%, rgba(175,169,236,0.20), transparent 70%), linear-gradient(180deg, #FFFFFF 0%, #FAFAFE 100%)',
      }}/>
      {/* grain dots */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.4 }}>
        <defs>
          <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#7F77DD" opacity="0.18"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)"/>
      </svg>

      <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: '72px 28px 80px', display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 48, alignItems: 'center' }}>
        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(127,119,221,0.25)',
            padding: '6px 14px 6px 8px', borderRadius: 999, fontSize: 13, fontWeight: 600, color: 'var(--purple-600)',
            marginBottom: 24,
          }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--purple-400)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon.Shield size={12} color="white"/>
            </span>
            Built for late-night walks home
          </div>

          <h1 style={{
            fontSize: 64, fontWeight: 800, letterSpacing: -1.6, lineHeight: 1.05,
            margin: 0, color: '#1A1A28',
          }}>
            Walk home like<br/>
            <span style={{ color: 'var(--purple-600)', position: 'relative' }}>
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
            <button onClick={onCTA} className="sw-btn sw-btn-primary" style={{ height: 56, padding: '0 26px', fontSize: 16, borderRadius: 14 }}>
              Try SafeWalk free
              <Icon.Chevron color="white" size={16}/>
            </button>
            <a href="#how" className="sw-btn sw-btn-ghost" style={{ height: 56, padding: '0 22px', fontSize: 15, borderRadius: 14, textDecoration: 'none' }}>
              See how it works
            </a>
          </div>

          <div style={{ display: 'flex', gap: 20, marginTop: 30, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex' }}>
              {['SJ', 'MC', 'PP', 'DK', 'AL'].map((i, idx) => (
                <div key={i} style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: ['#534AB7', '#6B62D4', '#AFA9EC', '#7F77DD', '#3C3489'][idx],
                  color: 'white', fontWeight: 700, fontSize: 11,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid white',
                  marginLeft: idx === 0 ? 0 : -8,
                }}>{i}</div>
              ))}
            </div>
            <div>
              <div style={{ display: 'flex', gap: 2, marginBottom: 2 }}>
                {[1,2,3,4,5].map(i => <Icon.Star key={i} size={14} color="#E8A020"/>)}
                <span style={{ fontSize: 13, fontWeight: 700, marginLeft: 4 }}>4.9</span>
              </div>
              <div style={{ fontSize: 12, color: '#6F6F84' }}>from 12,400+ students &amp; solo walkers</div>
            </div>
          </div>
        </div>

        {/* Phone mockup */}
        <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
          {/* glow */}
          <div style={{
            position: 'absolute', width: 420, height: 420, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(127,119,221,0.35), transparent 60%)',
            filter: 'blur(4px)', top: 80,
          }}/>
          <MarketingPhone tilt={-3}>
            <ActiveWalkScreen/>
          </MarketingPhone>
          {/* floating chip 1 */}
          <div style={{
            position: 'absolute', top: 90, left: -10,
            background: 'white', borderRadius: 14, padding: '10px 14px',
            boxShadow: '0 12px 30px rgba(38,33,92,0.14)',
            display: 'flex', alignItems: 'center', gap: 10,
            transform: 'rotate(-4deg)',
          }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon.Check color="var(--green)" size={16}/>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Check-in confirmed</div>
              <div style={{ fontSize: 10, color: '#6F6F84' }}>Sara · 2 min ago</div>
            </div>
          </div>
          {/* floating chip 2 */}
          <div style={{
            position: 'absolute', bottom: 80, right: -16,
            background: 'white', borderRadius: 14, padding: '10px 14px',
            boxShadow: '0 12px 30px rgba(38,33,92,0.14)',
            display: 'flex', alignItems: 'center', gap: 10,
            transform: 'rotate(3deg)',
          }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--purple-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon.Pin color="var(--purple-600)" size={14}/>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Sharing with 3 contacts</div>
              <div style={{ fontSize: 10, color: '#6F6F84' }}>Live · 0.4 km walked</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────
// Trust strip
// ───────────────────────────────────────────────────────────
function TrustStrip() {
  const items = [
    { icon: <Icon.Lock size={16} color="var(--purple-600)"/>, label: 'End-to-end encrypted' },
    { icon: <Icon.Shield size={16} color="var(--purple-600)"/>, label: 'PIPEDA compliant' },
    { icon: <Icon.Pin size={16} color="var(--purple-600)"/>, label: 'Location only during walks' },
    { icon: <span style={{ fontSize: 16 }}>🍁</span>, label: 'Made in Canada' },
  ];
  return (
    <section style={{ background: 'white', borderTop: '1px solid rgba(127,119,221,0.12)', borderBottom: '1px solid rgba(127,119,221,0.12)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 28px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {it.icon}
            <span style={{ fontSize: 13, fontWeight: 600, color: '#3F3F58' }}>{it.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────
// Press strip (placeholder logos)
// ───────────────────────────────────────────────────────────
function PressStrip() {
  const logos = ['The Globe', 'CBC', 'TechCrunch', 'Wired', 'Refinery29', 'CTV News'];
  return (
    <section style={{ background: '#FAFAFE', padding: '36px 28px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, letterSpacing: 1.4, color: '#9090A8', marginBottom: 22 }}>AS SEEN IN</div>
        <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 28, alignItems: 'center' }}>
          {logos.map(l => (
            <div key={l} style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 600, color: '#9090A8', fontStyle: l === 'Wired' ? 'italic' : 'normal', letterSpacing: l === 'CBC' ? 4 : 0 }}>{l}</div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────
// How it works
// ───────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { n: 1, title: 'Add your trusted contacts', body: 'Pick up to 5 people. They don\'t need the app — just a phone that gets texts.', illu: <IllustrationContacts/> },
    { n: 2, title: 'Start your walk', body: 'Tell SafeWalk where you\'re heading. We\'ll check in on you along the way.', illu: <IllustrationCheckin/> },
    { n: 3, title: 'Arrive safe — or get help', body: 'Tap to confirm you\'re okay. Miss a check-in or hit SOS, and your contacts get your live location.', illu: <IllustrationSOS/> },
  ];
  return (
    <section id="how" style={{ padding: '96px 28px 80px', background: 'white' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 56px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.2, color: 'var(--purple-600)', marginBottom: 12 }}>HOW IT WORKS</div>
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
                  background: 'var(--purple-400)', color: 'white',
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
  );
}

// ───────────────────────────────────────────────────────────
// Feature grid
// ───────────────────────────────────────────────────────────
function FeatureGrid() {
  const f = [
    { Icon: Icon.Clock, title: 'Smart check-ins', body: 'A gentle countdown asks "are you okay?" mid-walk. One tap and you\'re back on your way.' },
    { Icon: Icon.Alert, title: 'Press &amp; hold SOS', body: '3-second hold prevents accidental triggers. Once active, all contacts get your location instantly.' },
    { Icon: Icon.Users, title: 'Up to 5 contacts', body: 'Mom, your roommate, your best friend. They don\'t need the app — just text.' },
    { Icon: Icon.History, title: 'Walk history', body: 'See your routes, durations and check-ins. Auto-deleted after 30 days.' },
    { Icon: Icon.Lock, title: 'Privacy first', body: 'Location is only active during walks. We never track you in the background. Ever.' },
    { Icon: Icon.Phone, title: 'Voice escalation', body: 'No response? Your primary contact gets a phone call, not just a text.' },
  ];
  return (
    <section style={{ padding: '96px 28px', background: 'linear-gradient(180deg, #FAFAFE 0%, white 100%)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 56px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.2, color: 'var(--purple-600)', marginBottom: 12 }}>FEATURES</div>
          <h2 style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1, margin: 0, lineHeight: 1.1 }}>
            Everything you need.<br/>Nothing you don't.
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
          {f.map((it, i) => (
            <div key={i} style={{ background: 'white', borderRadius: 18, padding: 24, border: '1px solid rgba(127,119,221,0.12)' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: 'var(--purple-50)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
              }}>
                <it.Icon size={22} color="var(--purple-600)"/>
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6, letterSpacing: -0.2 }} dangerouslySetInnerHTML={{__html: it.title}}/>
              <p style={{ fontSize: 14, color: '#4A4A5A', lineHeight: 1.55, margin: 0 }} dangerouslySetInnerHTML={{__html: it.body}}/>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────
// Phone screenshot showcase (horizontal scroll-feel)
// ───────────────────────────────────────────────────────────
function Showcase() {
  const screens = [
    { label: 'Map-first home', el: <HomeIdleScreen/> },
    { label: 'Active walk', el: <ActiveWalkScreen/> },
    { label: 'Trusted contacts', el: <ContactsScreen/> },
    { label: 'Walk history', el: <HistoryScreen/> },
    { label: 'Live location share', el: <TrackScreen/> },
  ];
  return (
    <section style={{ padding: '96px 0 80px', background: 'linear-gradient(180deg, white 0%, #EEEDFE 100%)', overflow: 'hidden' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 28px' }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 48px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.2, color: 'var(--purple-600)', marginBottom: 12 }}>YOUR APP</div>
          <h2 style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1, margin: 0, lineHeight: 1.1 }}>
            Calm by design.
          </h2>
          <p style={{ fontSize: 16, color: '#4A4A5A', lineHeight: 1.55, marginTop: 16 }}>
            No clutter. No anxiety-inducing red. Just the things you need, when you need them.
          </p>
        </div>
      </div>
      <div style={{
        display: 'flex', gap: 28, padding: '0 64px 24px', overflowX: 'auto',
        scrollSnapType: 'x mandatory',
      }}>
        {screens.map((s, i) => (
          <div key={i} style={{ scrollSnapAlign: 'center', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <MarketingPhone>{s.el}</MarketingPhone>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--purple-800)' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────
// Stats band
// ───────────────────────────────────────────────────────────
function Stats() {
  const items = [
    { n: '142k', l: 'walks completed' },
    { n: '38k', l: 'students protected' },
    { n: '4.9★', l: 'average rating' },
    { n: '0', l: 'data sold to advertisers' },
  ];
  return (
    <section style={{ padding: '64px 28px', background: 'linear-gradient(135deg, var(--purple-600), var(--purple-800))', color: 'white' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
        {items.map((it, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1 }}>{it.n}</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 8, fontWeight: 500 }}>{it.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────
// Reviews (7)
// ───────────────────────────────────────────────────────────
function Reviews() {
  const reviews = [
    { name: 'Maya R.', who: 'McGill University · Montréal', initials: 'MR', color: '#534AB7', text: 'I use it every Friday after my late shift. Knowing my roommate gets pinged if I miss a check-in is genuinely calming.', stars: 5 },
    { name: 'Daniel O.', who: 'UBC · Vancouver', initials: 'DO', color: '#6B62D4', text: 'My mom finally stopped asking me to text her every five minutes. SafeWalk does it for me, automatically.', stars: 5 },
    { name: 'Aisha K.', who: "U of T · Toronto", initials: 'AK', color: '#7F77DD', text: 'The press-and-hold SOS is brilliant. I used to be terrified of butt-dialing 911. This actually feels safe to keep on.', stars: 5 },
    { name: 'Sara J.', who: 'Mom of a Western U student', initials: 'SJ', color: '#AFA9EC', text: 'I get a text the moment her walk starts and another when she\'s home. It\'s become a tiny ritual that means everything.', stars: 5 },
    { name: 'Chen L.', who: 'McMaster · Hamilton', initials: 'CL', color: '#3C3489', text: 'Walked home from the lab at 2 AM during finals. Check-ins kept me alert AND made me feel less alone.', stars: 5 },
    { name: 'Priya P.', who: 'University of Manitoba', initials: 'PP', color: '#534AB7', text: 'No subscription, no ads, no creepy data harvesting. It does one thing really well and respects me.', stars: 5 },
    { name: 'Jamie T.', who: 'Dalhousie · Halifax', initials: 'JT', color: '#6B62D4', text: 'I work nights. SafeWalk turned my walk to the bus stop from a daily anxiety spike into a non-event.', stars: 5 },
  ];
  return (
    <section id="reviews" style={{ padding: '96px 28px', background: 'white' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 56px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.2, color: 'var(--purple-600)', marginBottom: 12 }}>REVIEWS</div>
          <h2 style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1, margin: 0, lineHeight: 1.1 }}>
            Real walks. Real peace of mind.
          </h2>
        </div>

        <div style={{ columnCount: 3, columnGap: 18 }}>
          {reviews.map((r, i) => (
            <div key={i} style={{ breakInside: 'avoid', marginBottom: 18, background: '#FAFAFE', border: '1px solid rgba(127,119,221,0.15)', borderRadius: 18, padding: 22 }}>
              <div style={{ display: 'flex', gap: 2, marginBottom: 10 }}>
                {Array.from({length: r.stars}).map((_, j) => <Icon.Star key={j} size={14} color="#E8A020"/>)}
              </div>
              <p style={{ fontSize: 15, lineHeight: 1.55, color: '#1A1A28', margin: 0, marginBottom: 16, textWrap: 'pretty' }}>
                "{r.text}"
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: r.color, color: 'white', fontWeight: 700, fontSize: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
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
  );
}

// ───────────────────────────────────────────────────────────
// FAQ
// ───────────────────────────────────────────────────────────
function FAQ() {
  const faqs = [
    { q: 'Is SafeWalk free?', a: 'Yes. The core experience — check-ins, SOS, up to 5 contacts, walk history — is completely free, with no ads.' },
    { q: 'Do my contacts need the app?', a: 'No. They only need a phone that receives text messages. They get a private link with your live location during an emergency.' },
    { q: 'Are you tracking me all the time?', a: 'No. Location is only collected while a walk is active and is automatically deleted after 30 days. We never run in the background.' },
    { q: 'What happens if I miss a check-in?', a: 'You get 90 seconds to respond. If you don\'t, all your contacts receive an SMS with your live location, and your primary contact also gets a phone call.' },
    { q: 'Will it call 911 automatically?', a: 'No. SafeWalk shows a one-tap option to call 911 yourself, but never calls them on your behalf without your action.' },
    { q: 'Is my data sold to anyone?', a: 'No. Ever. We are PIPEDA compliant and your walk history is yours alone. You can export or delete it anytime.' },
  ];
  const [open, setOpen] = useStateL(0);
  return (
    <section id="faq" style={{ padding: '96px 28px', background: '#FAFAFE' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.2, color: 'var(--purple-600)', marginBottom: 12 }}>FAQ</div>
          <h2 style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1, margin: 0, lineHeight: 1.1 }}>
            Questions, answered.
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {faqs.map((it, i) => {
            const isOpen = open === i;
            return (
              <div key={i} onClick={() => setOpen(isOpen ? -1 : i)} style={{
                background: 'white', borderRadius: 14, padding: '18px 22px', cursor: 'pointer',
                border: isOpen ? '1px solid var(--purple-400)' : '1px solid rgba(127,119,221,0.12)',
                transition: 'border-color .15s',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.2 }}>{it.q}</div>
                  <Icon.Chevron color="var(--purple-600)" dir={isOpen ? 'down' : 'right'}/>
                </div>
                {isOpen && (
                  <div style={{ fontSize: 14, color: '#4A4A5A', lineHeight: 1.6, marginTop: 12, textWrap: 'pretty' }}>
                    {it.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────
// Final CTA band
// ───────────────────────────────────────────────────────────
function FinalCTA({ onCTA }) {
  return (
    <section style={{ padding: '88px 28px', background: 'white' }}>
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        background: 'linear-gradient(135deg, var(--purple-400), var(--purple-600) 60%, var(--purple-800))',
        borderRadius: 32, padding: '64px 56px', color: 'white',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* deco rings */}
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
            <button onClick={onCTA} className="sw-btn" style={{ background: 'white', color: 'var(--purple-600)', height: 56, padding: '0 28px', fontSize: 16, borderRadius: 14, fontWeight: 700 }}>
              Try SafeWalk free
              <Icon.Chevron color="var(--purple-600)" size={16}/>
            </button>
            <a href="#how" className="sw-btn" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', height: 56, padding: '0 22px', fontSize: 15, borderRadius: 14, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.3)' }}>
              See how it works
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────
// Footer
// ───────────────────────────────────────────────────────────
function Footer() {
  const cols = [
    { h: 'Product', items: ['How it works', 'Features', 'Reviews', 'FAQ'] },
    { h: 'Company', items: ['About', 'Press', 'Contact', 'Blog'] },
    { h: 'Legal', items: ['Privacy policy', 'Terms of service', 'PIPEDA compliance', 'Data deletion'] },
  ];
  return (
    <footer style={{ background: '#1A1A28', color: 'rgba(255,255,255,0.85)', padding: '64px 28px 32px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 48, marginBottom: 48 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <Logo size="sm"/>
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
                  <a key={it} href="#" onClick={e=>e.preventDefault()} style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, textDecoration: 'none' }}>{it}</a>
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
  );
}

// ───────────────────────────────────────────────────────────
// Page assembly
// ───────────────────────────────────────────────────────────
function LandingPage() {
  const goToSignup = () => { window.location.href = 'SafeWalk.html'; };
  const goToSignin = (e) => { /* default link nav fine */ };
  return (
    <div style={{ background: 'white', color: 'var(--dark)', fontFamily: 'var(--font)' }}>
      <NavBar onCTA={goToSignup} onSignIn={goToSignin}/>
      <Hero onCTA={goToSignup}/>
      <TrustStrip/>
      <PressStrip/>
      <HowItWorks/>
      <FeatureGrid/>
      <Showcase/>
      <Stats/>
      <Reviews/>
      <FAQ/>
      <FinalCTA onCTA={goToSignup}/>
      <Footer/>
    </div>
  );
}

Object.assign(window, { LandingPage });
