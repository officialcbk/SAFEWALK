// SafeWalk — Home / Active walk / Check-in / SOS / Escalation

// HomeIdle — map first, idle bottom sheet
function HomeIdleScreen() {
  return (
    <Screen>
      <MapCanvas>
        <UserPin x="50%" y="58%"/>
      </MapCanvas>

      {/* Top app bar */}
      <div className="sw-app-top">
        <LogoBadge/>
        <div style={{ display: 'flex', gap: 10 }}>
          <FloatingMapBtn label="Layers"><Icon.Layers/></FloatingMapBtn>
          <Avatar initials="AJ"/>
        </div>
      </div>

      {/* Floating map control */}
      <FloatingMapBtn label="Recenter" style={{ position: 'absolute', right: 16, bottom: 354, zIndex: 5 }}>
        <Icon.Crosshair/>
      </FloatingMapBtn>

      {/* Idle sheet */}
      <div className="sw-sheet">
        <div className="sw-sheet-handle"/>

        <div className="sw-search" style={{ marginBottom: 14 }}>
          <Icon.Search size={18} color="var(--gray-text)"/>
          <input placeholder="Where are you walking to?" readOnly/>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--purple-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon.Pin size={14} color="var(--purple-600)"/>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <div className="sw-stat">
            <div className="sw-stat-label">This month</div>
            <div className="sw-stat-value">14 walks</div>
          </div>
          <div className="sw-stat">
            <div className="sw-stat-label">Contacts</div>
            <div className="sw-stat-value">3</div>
          </div>
          <div className="sw-stat">
            <div className="sw-stat-label">Status</div>
            <div className="sw-stat-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }}/>
              Safe
            </div>
          </div>
        </div>

        <button className="sw-btn sw-btn-primary sw-btn-block" style={{ height: 56, fontSize: 17 }}>
          <Icon.Walk size={20} color="white"/>
          Start walk
        </button>
      </div>

      <TabBar active="home"/>
    </Screen>
  );
}

// HomeDestinationPicker — destination chosen, ready to start
function HomeDestinationScreen() {
  return (
    <Screen>
      <MapCanvas>
        <RouteLine/>
        <UserPin x="14%" y="52%"/>
        <DestPin x="78%" y="28%" label="8 min · 0.7 km"/>
      </MapCanvas>

      <div className="sw-app-top">
        <FloatingMapBtn label="Back"><Icon.Chevron dir="left"/></FloatingMapBtn>
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
            <div>
              <div style={{ fontSize: 11, color: 'var(--gray-text)', fontWeight: 600 }}>FROM</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Current location · Portage Ave</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--gray-text)', fontWeight: 600 }}>TO</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>The Forks Market</div>
            </div>
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

        <button className="sw-btn sw-btn-primary sw-btn-block" style={{ height: 56, fontSize: 17 }}>
          Start walk
        </button>
      </div>
    </Screen>
  );
}

// ActiveWalk — main in-progress screen
function ActiveWalkScreen() {
  return (
    <Screen>
      <MapCanvas>
        <RouteLine points="55,420 195,420 195,288 305,228"/>
        <UserPin x="50%" y="58%"/>
        <DestPin x="78%" y="28%" label="6 min"/>
      </MapCanvas>

      {/* Active status banner replacing top */}
      <div className="sw-app-top" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0))', paddingTop: 12, paddingBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 0 4px rgba(59,109,17,0.2)' }}/>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Walk in progress</div>
            <div style={{ fontSize: 11, color: 'var(--gray-text)' }}>Sharing with 3 contacts</div>
          </div>
        </div>
        <Avatar initials="AJ"/>
      </div>

      <div className="sw-sheet" style={{ paddingBottom: 24 }}>
        <div className="sw-sheet-handle"/>

        {/* Check-in countdown bar */}
        <div style={{
          background: 'var(--purple-400)',
          borderRadius: 14,
          padding: '14px 16px',
          color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 14,
          boxShadow: '0 4px 14px rgba(127,119,221,0.3)',
        }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 600, letterSpacing: 0.4 }}>NEXT CHECK-IN</div>
            <div style={{ fontSize: 20, fontWeight: 700 }} className="sw-mono">1:14</div>
          </div>
          <button style={{
            background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none',
            borderRadius: 999, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>I'm okay</button>
        </div>

        {/* Session info */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <div className="sw-stat">
            <div className="sw-stat-label">Time</div>
            <div className="sw-stat-value sw-mono">12:34</div>
          </div>
          <div className="sw-stat">
            <div className="sw-stat-label">Distance</div>
            <div className="sw-stat-value">0.4 km</div>
          </div>
          <div className="sw-stat">
            <div className="sw-stat-label">ETA</div>
            <div className="sw-stat-value">9:49</div>
          </div>
        </div>

        {/* SOS row */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div className="sw-sos">SOS</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--gray-text)', marginBottom: 8, fontWeight: 500 }}>
              Press &amp; hold to alert all contacts immediately
            </div>
            <button className="sw-btn sw-btn-ghost sw-btn-block">End walk</button>
          </div>
        </div>
      </div>
    </Screen>
  );
}

// Check-in overlay (Stage 1)
function CheckInOverlay() {
  return (
    <Screen>
      {/* Map dimmed underneath */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.5 }}>
        <MapCanvas><UserPin x="50%" y="50%"/></MapCanvas>
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(133,79,11,0.18)' }}/>

      <StatusBar/>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative', zIndex: 2 }}>
        <div style={{
          background: 'var(--amber-bg)',
          borderRadius: '28px 28px 0 0',
          padding: '20px 24px 32px',
          boxShadow: '0 -12px 40px rgba(0,0,0,0.18)',
        }}>
          <div className="sw-sheet-handle"/>

          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'rgba(232,160,32,0.18)',
            border: '2px solid #E8A020',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '4px auto 16px',
          }}>
            <Icon.Alert size={32} color="var(--amber)"/>
          </div>

          <div style={{ textAlign: 'center', fontSize: 26, fontWeight: 800, letterSpacing: -0.5, color: 'var(--amber)' }}>
            Are you okay?
          </div>
          <div style={{ textAlign: 'center', fontSize: 14, color: '#6B4308', marginTop: 8, marginBottom: 16, lineHeight: 1.5 }}>
            We haven't heard from you. Tap to confirm you're safe.
          </div>

          <div style={{
            background: 'white',
            borderRadius: 14,
            padding: '14px 16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 14,
          }}>
            <div style={{ fontSize: 12, color: 'var(--gray-text)', fontWeight: 600, letterSpacing: 0.3 }}>CONTACTS ALERTED IN</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--amber)' }} className="sw-mono">0:23</div>
          </div>

          <button style={{
            width: '100%', height: 56,
            background: '#E8A020', color: 'white',
            border: 'none', borderRadius: 14,
            fontSize: 17, fontWeight: 700, cursor: 'pointer',
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

// Escalation ladder — Stage 2+ (post-SOS or post-timeout)
function EscalationScreen() {
  const stages = [
    { stage: 1, label: 'Check-in missed', detail: '90 seconds without response', state: 'done' },
    { stage: 2, label: 'Contacts notified', detail: 'SMS sent to 3 contacts with location link', state: 'done' },
    { stage: 3, label: 'Voice call', detail: 'Calling Sara Johnson (primary)…', state: 'active' },
    { stage: 4, label: '911 option', detail: 'Available in 22s', state: 'pending' },
    { stage: 5, label: 'Ongoing monitoring', detail: 'Location pings continue', state: 'pending' },
  ];
  return (
    <Screen>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.4 }}>
        <MapCanvas><UserPin x="50%" y="50%"/></MapCanvas>
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(226,75,74,0.15)' }}/>

      <StatusBar/>

      {/* Top alert */}
      <div style={{
        position: 'relative', zIndex: 2,
        margin: '8px 16px 0',
        background: 'var(--red)',
        color: 'white',
        borderRadius: 16,
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
        boxShadow: '0 8px 24px rgba(226,75,74,0.4)',
      }}>
        <Icon.Alert size={20} color="white"/>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Emergency response active</div>
          <div style={{ fontSize: 11, opacity: 0.9 }}>Started 1m 12s ago</div>
        </div>
        <span className="sw-spin"/>
      </div>

      <div style={{ flex: 1 }}/>

      <div style={{
        position: 'relative', zIndex: 2,
        background: 'white',
        borderRadius: '28px 28px 0 0',
        padding: '8px 20px 24px',
        boxShadow: '0 -12px 40px rgba(0,0,0,0.15)',
      }}>
        <div className="sw-sheet-handle"/>

        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 14 }}>Response ladder</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
          {stages.map((s, i) => (
            <div key={s.stage} style={{ display: 'flex', gap: 12, padding: '8px 0', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: s.state === 'done' ? 'var(--green)' : s.state === 'active' ? 'var(--red)' : 'var(--gray-bg)',
                  border: s.state === 'pending' ? '2px solid var(--gray-border)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white',
                  boxShadow: s.state === 'active' ? '0 0 0 4px rgba(226,75,74,0.2)' : 'none',
                }}>
                  {s.state === 'done' ? <Icon.Check size={12} color="white"/>
                    : s.state === 'active' ? <span style={{ width:8, height:8, borderRadius:'50%', background:'white' }}/>
                    : <span style={{ fontSize:10, fontWeight:700, color:'var(--gray-text)' }}>{s.stage}</span>}
                </div>
                {i < stages.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 18, background: 'var(--gray-border)', margin: '2px 0' }}/>}
              </div>
              <div style={{ flex: 1, paddingBottom: 4 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: s.state === 'pending' ? 'var(--gray-text)' : 'var(--dark)' }}>{s.label}</div>
                <div style={{ fontSize: 12, color: 'var(--gray-text)', marginTop: 2 }}>{s.detail}</div>
              </div>
            </div>
          ))}
        </div>

        <button className="sw-btn sw-btn-primary sw-btn-block" style={{ marginBottom: 8 }}>
          <Icon.Check color="white" size={18}/> I'm okay — cancel response
        </button>
        <button className="sw-btn sw-btn-danger sw-btn-block">
          <Icon.Phone color="white" size={16}/> Call 911
        </button>
      </div>
    </Screen>
  );
}

// SOS triggered (after 3-second hold)
function SOSTriggeredScreen() {
  return (
    <Screen>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.35 }}>
        <MapCanvas><UserPin x="50%" y="50%"/></MapCanvas>
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(226,75,74,0.55)' }}/>

      <StatusBar dark/>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 2, padding: 24 }}>
        <div style={{ position: 'relative', marginBottom: 32 }}>
          {/* expanding rings */}
          <div style={{ position: 'absolute', inset: -40, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', animation: 'sw-pulse 1.6s ease-out infinite' }}/>
          <div style={{ position: 'absolute', inset: -70, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.25)', animation: 'sw-pulse 1.6s ease-out 0.4s infinite' }}/>
          <div style={{
            width: 140, height: 140, borderRadius: '50%',
            background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
          }}>
            <div style={{ color: 'var(--red)', fontSize: 32, fontWeight: 800, letterSpacing: 2 }}>SOS</div>
          </div>
        </div>

        <div style={{ color: 'white', fontSize: 28, fontWeight: 800, textAlign: 'center', letterSpacing: -0.5, marginBottom: 8 }}>
          Emergency activated
        </div>
        <div style={{ color: 'rgba(255,255,255,0.92)', fontSize: 14, textAlign: 'center', maxWidth: 280, lineHeight: 1.5, marginBottom: 28 }}>
          Your trusted contacts are being notified with your live location.
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.16)', backdropFilter: 'blur(12px)',
          borderRadius: 14, padding: '14px 16px',
          display: 'flex', flexDirection: 'column', gap: 10, width: '100%',
        }}>
          {['Sara Johnson · Primary', 'Marcus Chen', 'Priya Patel'].map((n, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'white' }}>
              <Icon.Check size={16} color="white"/>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{n}</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.8 }}>SMS sent</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 2, padding: '0 20px 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="sw-btn sw-btn-block" style={{ background: 'white', color: 'var(--red-text)', height: 56, fontSize: 16 }}>
          I'm okay — cancel
        </button>
        <button className="sw-btn sw-btn-block" style={{ background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', height: 56, fontSize: 16 }}>
          <Icon.Phone color="white" size={16}/> Call 911
        </button>
      </div>
    </Screen>
  );
}

Object.assign(window, { HomeIdleScreen, HomeDestinationScreen, ActiveWalkScreen, CheckInOverlay, EscalationScreen, SOSTriggeredScreen });
