// SafeWalk — Interactive prototype controller
// A single iOS frame whose internal state navigates through the full app

const { useState, useEffect, useRef } = React;

function InteractiveProto() {
  // Top-level navigation state
  const [route, setRoute] = useState('signin');
  // signin -> signup -> checkemail -> ob1 -> ob2 -> ob3 -> home -> destpicker -> active -> checkin -> escalation -> sos -> contacts -> addcontact -> history -> settings -> track

  const go = (r) => setRoute(r);

  // Render the right screen
  let inner;
  switch (route) {
    case 'signin':       inner = <SignInScreenInteractive go={go}/>; break;
    case 'signup':       inner = <SignUpScreenInteractive go={go}/>; break;
    case 'checkemail':   inner = <CheckEmailScreenInteractive go={go}/>; break;
    case 'ob1':          inner = <OB1 go={go}/>; break;
    case 'ob2':          inner = <OB2 go={go}/>; break;
    case 'ob3':          inner = <OB3 go={go}/>; break;
    case 'home':         inner = <HomeInteractive go={go}/>; break;
    case 'destpicker':   inner = <DestPickerInteractive go={go}/>; break;
    case 'active':       inner = <ActiveInteractive go={go}/>; break;
    case 'checkin':      inner = <CheckInInteractive go={go}/>; break;
    case 'escalation':   inner = <EscalationInteractive go={go}/>; break;
    case 'sos':          inner = <SOSInteractive go={go}/>; break;
    case 'contacts':     inner = <ContactsInteractive go={go}/>; break;
    case 'addcontact':   inner = <AddContactInteractive go={go}/>; break;
    case 'history':      inner = <HistoryInteractive go={go}/>; break;
    case 'settings':     inner = <SettingsInteractive go={go}/>; break;
    case 'track':        inner = <TrackInteractive/>; break;
    default:             inner = <HomeInteractive go={go}/>;
  }

  return (
    <div className="sw-fade-in" key={route} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {inner}
    </div>
  );
}

// Wrap the static screens with interactivity / navigation buttons
function SignInScreenInteractive({ go }) {
  const [loading, setLoading] = useState(false);
  const handleSignIn = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); go('home'); }, 900);
  };
  return (
    <Screen bg="white">
      <StatusBar/>
      <div style={{ flex: 1, padding: '20px 28px 28px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <Logo size="lg"/>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.4 }}>Welcome back</div>
            <div className="sw-muted" style={{ fontSize: 14, marginTop: 4 }}>Your safety, always on</div>
          </div>
        </div>

        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="sw-field"><label>Email</label><input defaultValue="alex@safewalk.app"/></div>
          <div className="sw-field"><label>Password</label><input type="password" defaultValue="securepass"/></div>
        </div>

        <button className="sw-btn sw-btn-primary sw-btn-block" style={{ marginTop: 18 }} onClick={handleSignIn}>
          {loading ? <span className="sw-spin"/> : 'Sign in'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <a href="#" onClick={e=>{e.preventDefault();}} style={{ color: 'var(--purple-600)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Forgot password?</a>
        </div>

        <div style={{ flex: 1 }}/>

        <div style={{
          background: 'var(--purple-50)', borderRadius: 12, padding: '12px 14px',
          display: 'flex', alignItems: 'center', gap: 10, color: 'var(--purple-800)', fontSize: 12, fontWeight: 500,
        }}>
          <Icon.Lock color="var(--purple-600)" size={14}/>
          <span>End-to-end encrypted · PIPEDA compliant</span>
        </div>

        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 13, color: 'var(--gray-text)' }}>
          New here?{' '}
          <a href="#" onClick={e=>{e.preventDefault();go('signup');}} style={{ color: 'var(--purple-600)', fontWeight: 600, textDecoration: 'none' }}>Create account →</a>
        </div>
      </div>
    </Screen>
  );
}

function SignUpScreenInteractive({ go }) {
  return (
    <div onClick={(e) => { /* allow click-through to button */ }} style={{ width:'100%', height:'100%' }}>
      <SignUpScreenWithGo go={go}/>
    </div>
  );
}
function SignUpScreenWithGo({ go }) {
  return (
    <Screen bg="white">
      <StatusBar/>
      <div style={{ flex: 1, padding: '20px 28px 28px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Logo size="md"/>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>Create account</div>
            <div className="sw-muted" style={{ fontSize: 13, marginTop: 2 }}>Safe in 2 minutes</div>
          </div>
        </div>
        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="sw-field"><label>Full name</label><input defaultValue="Alex Johnson"/></div>
          <div className="sw-field"><label>Email</label><input defaultValue="alex@safewalk.app"/></div>
          <div className="sw-field"><label>Password</label><input type="password" defaultValue="walksafe24"/></div>
        </div>
        <button className="sw-btn sw-btn-primary sw-btn-block" style={{ marginTop: 18 }} onClick={()=>go('checkemail')}>Create account</button>
        <div style={{ flex: 1 }}/>
        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--gray-text)' }}>
          Already have one?{' '}
          <a href="#" onClick={e=>{e.preventDefault();go('signin');}} style={{ color: 'var(--purple-600)', fontWeight: 600, textDecoration: 'none' }}>Sign in →</a>
        </div>
      </div>
    </Screen>
  );
}

function CheckEmailScreenInteractive({ go }) {
  return (
    <Screen bg="white">
      <StatusBar/>
      <div style={{ flex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
          <Icon.Mail size={36} color="var(--green)"/>
        </div>
        <div className="sw-h1" style={{ marginBottom: 8 }}>Check your email</div>
        <div className="sw-body">We sent a confirmation link to</div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>alex@safewalk.app</div>
        <div className="sw-body" style={{ marginBottom: 28 }}>Click it to activate your account.</div>
        <button className="sw-btn sw-btn-primary sw-btn-block" onClick={()=>go('ob1')}>I've confirmed — continue</button>
        <button className="sw-btn sw-btn-ghost sw-btn-block" style={{ marginTop: 10 }}>Resend email</button>
        <a href="#" onClick={e=>{e.preventDefault();go('signin');}} style={{ marginTop: 24, color: 'var(--purple-600)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>← Back to sign in</a>
      </div>
    </Screen>
  );
}

function OB1({ go }) {
  return (
    <Screen bg="white">
      <StatusBar/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 320, background: 'var(--purple-50)', borderRadius: '0 0 32px 32px', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', width: 280, height: 280, borderRadius: '50%', border: '1.5px solid rgba(127,119,221,0.25)' }}/>
          <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', border: '1.5px solid rgba(127,119,221,0.35)' }}/>
          <div style={{ position: 'absolute', width: 160, height: 160, borderRadius: '50%', background: 'rgba(127,119,221,0.18)' }}/>
          <div style={{ width: 110, height: 110, borderRadius: '50%', background: 'linear-gradient(135deg, var(--purple-400), var(--purple-600))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 30px rgba(127,119,221,0.45)' }}>
            <Icon.Walk size={48} color="white"/>
          </div>
        </div>
        <div style={{ flex: 1, padding: '28px 28px 24px', display: 'flex', flexDirection: 'column' }}>
          <div className="sw-dots" style={{ marginBottom: 20 }}><span className="active"/><span/><span/></div>
          <div className="sw-h1" style={{ marginBottom: 10, textAlign: 'center' }}>Stay safe while you walk.</div>
          <div className="sw-body" style={{ textAlign: 'center', maxWidth: 320, margin: '0 auto' }}>
            SafeWalk monitors your journey and alerts your trusted contacts if something seems wrong.
          </div>
          <div style={{ flex: 1 }}/>
          <button className="sw-btn sw-btn-primary sw-btn-block" onClick={()=>go('ob2')}>Next</button>
        </div>
      </div>
    </Screen>
  );
}

function OB2({ go }) {
  return (
    <Screen bg="white">
      <StatusBar/>
      <div style={{ flex: 1, padding: '20px 28px 24px', display: 'flex', flexDirection: 'column' }}>
        <div className="sw-dots" style={{ marginBottom: 18, marginTop: 2 }}><span/><span className="active"/><span/></div>
        <div className="sw-h1" style={{ marginBottom: 8 }}>Add your trusted contacts.</div>
        <div className="sw-body" style={{ marginBottom: 18 }}>
          Choose up to 5 people who'll be notified if you need help.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="sw-field"><label>Full name</label><input defaultValue="Sara Johnson"/></div>
          <div className="sw-field"><label>Phone number</label><input defaultValue="+1 (204) 555-0192"/></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--purple-50)', borderRadius: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Set as primary</div>
              <div style={{ fontSize: 12, color: 'var(--gray-text)' }}>Voice call during emergencies</div>
            </div>
            <Toggle on={true}/>
          </div>
        </div>
        <div style={{ flex: 1 }}/>
        <button className="sw-btn sw-btn-primary sw-btn-block" onClick={()=>go('ob3')}>Add contact and continue</button>
        <button className="sw-btn sw-btn-text sw-btn-block" style={{ marginTop: 6 }} onClick={()=>go('ob3')}>Skip for now</button>
      </div>
    </Screen>
  );
}

function OB3({ go }) {
  return (
    <Screen bg="white">
      <StatusBar dark/>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.55 }}>
        <MapCanvas><UserPin x="50%" y="50%"/></MapCanvas>
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }}/>
      <div style={{ flex: 1 }}/>
      <div style={{ background: 'white', borderRadius: '24px 24px 0 0', padding: '8px 24px 28px', position: 'relative', zIndex: 5, boxShadow: '0 -10px 40px rgba(0,0,0,0.2)' }}>
        <div className="sw-sheet-handle"/>
        <div className="sw-dots" style={{ margin: '4px 0 16px' }}><span/><span/><span className="active"/></div>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--purple-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <Icon.Pin size={28} color="var(--purple-600)"/>
        </div>
        <div className="sw-h1" style={{ marginBottom: 8 }}>Allow location access.</div>
        <div className="sw-body" style={{ marginBottom: 14 }}>
          SafeWalk needs your location only while a walk is active. We never track you in the background.
        </div>
        <div style={{ background: 'var(--purple-50)', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 18 }}>
          <Icon.Shield size={18} color="var(--purple-600)"/>
          <div style={{ fontSize: 12, color: 'var(--purple-800)', lineHeight: 1.5 }}>
            Location is only active during walks and deleted after 30 days.
          </div>
        </div>
        <button className="sw-btn sw-btn-primary sw-btn-block" onClick={()=>go('home')}>Allow location</button>
        <button className="sw-btn sw-btn-text sw-btn-block" style={{ marginTop: 4 }} onClick={()=>go('home')}>Not now</button>
      </div>
    </Screen>
  );
}

function HomeInteractive({ go }) {
  return (
    <Screen>
      <MapCanvas><UserPin x="50%" y="58%"/></MapCanvas>

      <div className="sw-app-top">
        <LogoBadge/>
        <div style={{ display: 'flex', gap: 10 }}>
          <FloatingMapBtn label="Layers"><Icon.Layers/></FloatingMapBtn>
          <div onClick={()=>go('settings')} style={{cursor:'pointer'}}><Avatar initials="AJ"/></div>
        </div>
      </div>

      <FloatingMapBtn label="Recenter" style={{ position: 'absolute', right: 16, bottom: 354, zIndex: 5 }}>
        <Icon.Crosshair/>
      </FloatingMapBtn>

      <div className="sw-sheet">
        <div className="sw-sheet-handle"/>
        <div className="sw-search" style={{ marginBottom: 14, cursor: 'pointer' }} onClick={()=>go('destpicker')}>
          <Icon.Search size={18} color="var(--gray-text)"/>
          <input placeholder="Where are you walking to?" readOnly/>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--purple-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon.Pin size={14} color="var(--purple-600)"/>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <div className="sw-stat"><div className="sw-stat-label">This month</div><div className="sw-stat-value">14 walks</div></div>
          <div className="sw-stat"><div className="sw-stat-label">Contacts</div><div className="sw-stat-value">3</div></div>
          <div className="sw-stat">
            <div className="sw-stat-label">Status</div>
            <div className="sw-stat-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }}/> Safe
            </div>
          </div>
        </div>

        <button className="sw-btn sw-btn-primary sw-btn-block" style={{ height: 56, fontSize: 17 }} onClick={()=>go('active')}>
          <Icon.Walk size={20} color="white"/> Start walk
        </button>
      </div>

      <TabBar active="home" onChange={(t)=>{
        if (t==='contacts') go('contacts');
        if (t==='history') go('history');
        if (t==='settings') go('settings');
      }}/>
    </Screen>
  );
}

function DestPickerInteractive({ go }) {
  return (
    <Screen>
      <MapCanvas>
        <RouteLine/>
        <UserPin x="14%" y="52%"/>
        <DestPin x="78%" y="28%" label="8 min · 0.7 km"/>
      </MapCanvas>

      <div className="sw-app-top">
        <div onClick={()=>go('home')} style={{cursor:'pointer'}}>
          <FloatingMapBtn label="Back"><Icon.Chevron dir="left"/></FloatingMapBtn>
        </div>
        <Avatar initials="AJ"/>
      </div>

      <div className="sw-sheet">
        <div className="sw-sheet-handle"/>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '4px 4px 14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--purple-400)', border: '2px solid white', boxShadow: '0 0 0 1.5px var(--purple-400)' }}/>
            <span style={{ width: 2, height: 22, background: 'var(--gray-border)', borderRadius: 2, margin: '4px 0' }}/>
            <span style={{ width: 10, height: 10, borderRadius: '50% 50% 50% 0', background: 'var(--purple-600)', transform: 'rotate(-45deg)' }}/>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div><div style={{ fontSize: 11, color: 'var(--gray-text)', fontWeight: 600 }}>FROM</div><div style={{ fontSize: 14, fontWeight: 600 }}>Current location · Portage Ave</div></div>
            <div><div style={{ fontSize: 11, color: 'var(--gray-text)', fontWeight: 600 }}>TO</div><div style={{ fontSize: 14, fontWeight: 600 }}>The Forks Market</div></div>
          </div>
        </div>
        <div className="sw-divider"/>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 4px 14px' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }} className="sw-mono">8 min</div>
            <div style={{ fontSize: 12, color: 'var(--gray-text)' }}>0.7 km · arrive 9:49 AM</div>
          </div>
          <Badge variant="purple"><Icon.Shield size={12} color="var(--purple-600)"/> 3 contacts ready</Badge>
        </div>
        <button className="sw-btn sw-btn-primary sw-btn-block" style={{ height: 56, fontSize: 17 }} onClick={()=>go('active')}>Start walk</button>
      </div>
    </Screen>
  );
}

function ActiveInteractive({ go }) {
  // Live timer
  const [secs, setSecs] = useState(754); // 12:34
  const [checkin, setCheckin] = useState(74); // 1:14
  // SOS press-and-hold
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimer = useRef(null);

  useEffect(() => {
    const id = setInterval(() => {
      setSecs(s => s + 1);
      setCheckin(c => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { if (checkin === 0) go('checkin'); }, [checkin]);

  const fmt = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  const startHold = () => {
    setHoldProgress(0);
    const start = Date.now();
    holdTimer.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / 3000);
      setHoldProgress(p);
      if (p >= 1) {
        clearInterval(holdTimer.current);
        holdTimer.current = null;
        if (navigator.vibrate) navigator.vibrate([100,50,100,50,200]);
        go('sos');
      }
    }, 30);
  };
  const cancelHold = () => {
    if (holdTimer.current) { clearInterval(holdTimer.current); holdTimer.current = null; }
    setHoldProgress(0);
  };

  return (
    <Screen>
      <MapCanvas>
        <RouteLine points="55,420 195,420 195,288 305,228"/>
        <UserPin x="50%" y="58%"/>
        <DestPin x="78%" y="28%" label={`${Math.max(1, 8 - Math.floor(secs/120))} min`}/>
      </MapCanvas>

      <div className="sw-app-top" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0))', paddingTop: 12, paddingBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 0 4px rgba(59,109,17,0.2)' }}/>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Walk in progress</div>
            <div style={{ fontSize: 11, color: 'var(--gray-text)' }}>Sharing with 3 contacts</div>
          </div>
        </div>
        <div onClick={()=>go('settings')} style={{cursor:'pointer'}}><Avatar initials="AJ"/></div>
      </div>

      <div className="sw-sheet" style={{ paddingBottom: 24 }}>
        <div className="sw-sheet-handle"/>

        <div style={{
          background: 'var(--purple-400)', borderRadius: 14, padding: '14px 16px', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14,
          boxShadow: '0 4px 14px rgba(127,119,221,0.3)',
        }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 600, letterSpacing: 0.4 }}>NEXT CHECK-IN</div>
            <div style={{ fontSize: 20, fontWeight: 700 }} className="sw-mono">{fmt(checkin)}</div>
          </div>
          <button onClick={()=>setCheckin(90)} style={{
            background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none',
            borderRadius: 999, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>I'm okay</button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <div className="sw-stat"><div className="sw-stat-label">Time</div><div className="sw-stat-value sw-mono">{fmt(secs)}</div></div>
          <div className="sw-stat"><div className="sw-stat-label">Distance</div><div className="sw-stat-value">0.4 km</div></div>
          <div className="sw-stat"><div className="sw-stat-label">ETA</div><div className="sw-stat-value">9:49</div></div>
        </div>

        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div
            className="sw-sos"
            onPointerDown={startHold}
            onPointerUp={cancelHold}
            onPointerLeave={cancelHold}
            onPointerCancel={cancelHold}
            style={{ position: 'relative' }}
          >
            <svg width="78" height="78" style={{ position: 'absolute', inset: -3, transform: 'rotate(-90deg)' }}>
              <circle cx="39" cy="39" r="36" fill="none" stroke="white" strokeWidth="3" strokeDasharray={`${holdProgress * 226} 226`} strokeLinecap="round" opacity={holdProgress > 0 ? 1 : 0}/>
            </svg>
            SOS
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--gray-text)', marginBottom: 8, fontWeight: 500 }}>
              {holdProgress > 0 ? `Hold to alert · ${Math.ceil((1-holdProgress)*3)}s` : 'Press & hold to alert all contacts'}
            </div>
            <button className="sw-btn sw-btn-ghost sw-btn-block" onClick={()=>go('home')}>End walk</button>
          </div>
        </div>
      </div>
    </Screen>
  );
}

function CheckInInteractive({ go }) {
  const [secs, setSecs] = useState(23);
  useEffect(() => {
    const id = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => { if (secs === 0) go('escalation'); }, [secs]);

  return (
    <Screen>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.5 }}>
        <MapCanvas><UserPin x="50%" y="50%"/></MapCanvas>
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(133,79,11,0.18)' }}/>
      <StatusBar/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative', zIndex: 2 }}>
        <div style={{ background: 'var(--amber-bg)', borderRadius: '28px 28px 0 0', padding: '20px 24px 32px', boxShadow: '0 -12px 40px rgba(0,0,0,0.18)' }}>
          <div className="sw-sheet-handle"/>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'rgba(232,160,32,0.18)', border: '2px solid #E8A020',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '4px auto 16px',
          }}>
            <Icon.Alert size={32} color="var(--amber)"/>
          </div>
          <div style={{ textAlign: 'center', fontSize: 26, fontWeight: 800, letterSpacing: -0.5, color: 'var(--amber)' }}>Are you okay?</div>
          <div style={{ textAlign: 'center', fontSize: 14, color: '#6B4308', marginTop: 8, marginBottom: 16, lineHeight: 1.5 }}>
            We haven't heard from you. Tap to confirm you're safe.
          </div>
          <div style={{
            background: 'white', borderRadius: 14, padding: '14px 16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
          }}>
            <div style={{ fontSize: 12, color: 'var(--gray-text)', fontWeight: 600, letterSpacing: 0.3 }}>CONTACTS ALERTED IN</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--amber)' }} className="sw-mono">0:{String(secs).padStart(2,'0')}</div>
          </div>
          <button onClick={()=>go('active')} style={{
            width: '100%', height: 56, background: '#E8A020', color: 'white',
            border: 'none', borderRadius: 14, fontSize: 17, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 6px 18px rgba(232,160,32,0.4)',
          }}>I'm okay</button>
          <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--gray-text)', marginTop: 12 }}>
            Your contacts will be alerted if no response
          </div>
        </div>
      </div>
    </Screen>
  );
}

function EscalationInteractive({ go }) {
  return (
    <div onClick={()=>{}} style={{ width:'100%', height:'100%' }}>
      <EscalationScreen/>
      <div style={{ position: 'absolute', bottom: 100, left: 0, right: 0, padding: '0 20px', zIndex: 10 }}>
        <button className="sw-btn sw-btn-primary sw-btn-block" onClick={()=>go('active')}>I'm okay — back to walk</button>
      </div>
    </div>
  );
}
function SOSInteractive({ go }) {
  return (
    <div style={{ width:'100%', height:'100%', position: 'relative' }}>
      <SOSTriggeredScreen/>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', bottom: 124, left: 20, right: 20, pointerEvents: 'auto' }}>
          <button className="sw-btn sw-btn-block" style={{ background: 'white', color: 'var(--red-text)', height: 52, fontSize: 15 }} onClick={()=>go('active')}>I'm okay — cancel</button>
        </div>
      </div>
    </div>
  );
}
function ContactsInteractive({ go }) {
  return (
    <div style={{ width:'100%', height:'100%' }}>
      <Screen bg="var(--gray-bg)">
        <StatusBar/>
        <div style={{ padding: '12px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="sw-h1">Contacts</div>
          <button className="sw-btn" onClick={()=>go('addcontact')} style={{ background: 'var(--purple-400)', color: 'white', height: 40, padding: '0 14px', borderRadius: 999, fontSize: 13 }}>
            <Icon.Plus size={16} color="white"/> Add
          </button>
        </div>
        <div style={{ padding: '0 16px 100px', flex: 1, overflowY: 'auto' }}>
          <div style={{ background: 'var(--purple-50)', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Icon.Shield color="var(--purple-600)" size={18}/>
            <div style={{ fontSize: 12, color: 'var(--purple-800)', lineHeight: 1.5, flex: 1 }}>
              Trusted contacts are notified by SMS with your live location during an emergency.
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { name: 'Sara Johnson', phone: '+1 (204) 555-0192', initials: 'SJ', primary: true },
              { name: 'Marcus Chen', phone: '+1 (204) 555-0144', initials: 'MC' },
              { name: 'Priya Patel', phone: '+1 (431) 555-0210', initials: 'PP' },
            ].map(c => (
              <div key={c.name} className="sw-card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14 }}>
                <Avatar initials={c.initials} size={44}/>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{c.name}</span>
                    {c.primary && <Badge variant="purple">Primary</Badge>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--gray-text)', marginTop: 2 }}>{c.phone}</div>
                </div>
                <Icon.Chevron color="var(--gray-text)"/>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, fontSize: 12, color: 'var(--gray-text)', textAlign: 'center' }}>
            3 of 5 contacts · 2 slots remaining
          </div>
        </div>
        <TabBar active="contacts" onChange={(t)=>{
          if (t==='home') go('home');
          if (t==='history') go('history');
          if (t==='settings') go('settings');
        }}/>
      </Screen>
    </div>
  );
}

function AddContactInteractive({ go }) {
  return (
    <div style={{ width:'100%', height:'100%', position: 'relative' }}>
      {/* underlying contacts dimmed */}
      <div style={{ position: 'absolute', inset: 0 }}><ContactsScreen/></div>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }}/>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 10,
        background: 'white', borderRadius: '24px 24px 0 0', padding: '8px 24px 28px', boxShadow: '0 -10px 40px rgba(0,0,0,0.18)' }}>
        <div className="sw-sheet-handle"/>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="sw-h2">Add trusted contact</div>
          <button onClick={()=>go('contacts')} style={{ background: 'var(--gray-bg)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon.X color="var(--gray-text)" size={16}/>
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="sw-field"><label>Full name</label><input placeholder="e.g. Mom"/></div>
          <div className="sw-field"><label>Phone number</label><input placeholder="+1 (000) 000-0000"/></div>
          <div className="sw-field"><label>Email (optional)</label><input/></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--purple-50)', borderRadius: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Set as primary</div>
              <div style={{ fontSize: 12, color: 'var(--gray-text)' }}>Voice call during emergencies</div>
            </div>
            <Toggle on={false}/>
          </div>
        </div>
        <button className="sw-btn sw-btn-primary sw-btn-block" style={{ marginTop: 16 }} onClick={()=>go('contacts')}>Save contact</button>
      </div>
    </div>
  );
}

function HistoryInteractive({ go }) {
  return (
    <div style={{ width:'100%', height:'100%' }}>
      <HistoryScreen/>
      {/* override tab clicks */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 78, display: 'flex', zIndex: 100 }}>
        <div style={{ flex: 1, cursor: 'pointer' }} onClick={()=>go('home')}/>
        <div style={{ flex: 1, cursor: 'pointer' }} onClick={()=>go('contacts')}/>
        <div style={{ flex: 1 }}/>
        <div style={{ flex: 1, cursor: 'pointer' }} onClick={()=>go('settings')}/>
      </div>
    </div>
  );
}
function SettingsInteractive({ go }) {
  return (
    <div style={{ width:'100%', height:'100%' }}>
      <SettingsScreen/>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 78, display: 'flex', zIndex: 100 }}>
        <div style={{ flex: 1, cursor: 'pointer' }} onClick={()=>go('home')}/>
        <div style={{ flex: 1, cursor: 'pointer' }} onClick={()=>go('contacts')}/>
        <div style={{ flex: 1, cursor: 'pointer' }} onClick={()=>go('history')}/>
        <div style={{ flex: 1 }}/>
      </div>
    </div>
  );
}
function TrackInteractive() { return <TrackScreen/>; }

Object.assign(window, { InteractiveProto });
