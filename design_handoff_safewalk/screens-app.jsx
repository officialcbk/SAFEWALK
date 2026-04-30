// SafeWalk — Contacts / History / Settings / Public Track view

function ContactsScreen() {
  const contacts = [
    { name: 'Sara Johnson', phone: '+1 (204) 555-0192', initials: 'SJ', primary: true },
    { name: 'Marcus Chen', phone: '+1 (204) 555-0144', initials: 'MC', primary: false },
    { name: 'Priya Patel', phone: '+1 (431) 555-0210', initials: 'PP', primary: false },
  ];
  return (
    <Screen bg="var(--gray-bg)">
      <StatusBar/>
      <div style={{ padding: '12px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="sw-h1">Contacts</div>
        <button className="sw-btn" style={{ background: 'var(--purple-400)', color: 'white', height: 40, padding: '0 14px', borderRadius: 999, fontSize: 13 }}>
          <Icon.Plus size={16} color="white"/> Add
        </button>
      </div>

      <div style={{ padding: '0 16px 100px', flex: 1, overflowY: 'auto' }}>
        <div style={{
          background: 'var(--purple-50)', borderRadius: 14, padding: '12px 14px',
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
        }}>
          <Icon.Shield color="var(--purple-600)" size={18}/>
          <div style={{ fontSize: 12, color: 'var(--purple-800)', lineHeight: 1.5, flex: 1 }}>
            Trusted contacts are notified by SMS with your live location during an emergency.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {contacts.map(c => (
            <div key={c.name} className="sw-card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14 }}>
              <Avatar initials={c.initials} size={44}/>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{c.name}</span>
                  {c.primary && <Badge variant="purple">Primary</Badge>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--gray-text)', marginTop: 2 }}>{c.phone}</div>
              </div>
              <button style={{ background: 'transparent', border: 'none', color: 'var(--gray-text)', cursor: 'pointer', padding: 6 }}>
                <Icon.Chevron color="var(--gray-text)"/>
              </button>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, fontSize: 12, color: 'var(--gray-text)', textAlign: 'center' }}>
          3 of 5 contacts · 2 slots remaining
        </div>
      </div>

      <TabBar active="contacts"/>
    </Screen>
  );
}

function AddContactScreen() {
  return (
    <Screen>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }}/>
      <StatusBar dark/>
      <div style={{ flex: 1 }}/>
      <div style={{
        position: 'relative', zIndex: 2,
        background: 'white',
        borderRadius: '24px 24px 0 0',
        padding: '8px 24px 28px',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.18)',
      }}>
        <div className="sw-sheet-handle"/>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div className="sw-h2">Add trusted contact</div>
          <button style={{ background: 'var(--gray-bg)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon.X color="var(--gray-text)" size={16}/>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="sw-field">
            <label>Full name</label>
            <input placeholder="e.g. Mom"/>
          </div>
          <div className="sw-field">
            <label>Phone number</label>
            <input placeholder="+1 (000) 000-0000"/>
          </div>
          <div className="sw-field">
            <label>Email (optional)</label>
            <input placeholder="optional@email.com"/>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px', background: 'var(--purple-50)', borderRadius: 12,
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Set as primary</div>
              <div style={{ fontSize: 12, color: 'var(--gray-text)' }}>Receives a voice call during emergencies</div>
            </div>
            <Toggle on={false}/>
          </div>
        </div>

        <button className="sw-btn sw-btn-primary sw-btn-block" style={{ marginTop: 18 }}>Save contact</button>
      </div>
    </Screen>
  );
}

function HistoryScreen() {
  const walks = [
    { dest: 'The Forks Market', date: 'Today, 8:45 AM', dur: '22 min', dist: '1.2 km', status: 'Completed', variant: 'green' },
    { dest: 'Home', date: 'Yesterday, 11:08 PM', dur: '14 min', dist: '0.8 km', status: 'Completed', variant: 'green' },
    { dest: 'Walk', date: 'Apr 26, 7:30 PM', dur: '8 min', dist: '0.4 km', status: 'SOS used', variant: 'amber' },
    { dest: 'Bus stop', date: 'Apr 24, 6:12 AM', dur: '6 min', dist: '0.3 km', status: 'Completed', variant: 'green' },
    { dest: 'Polo Park', date: 'Apr 22, 2:20 PM', dur: '3 min', dist: '0.1 km', status: 'Ended early', variant: 'purple' },
  ];
  return (
    <Screen bg="var(--gray-bg)">
      <StatusBar/>
      <div style={{ padding: '12px 20px 16px' }}>
        <div className="sw-h1">History</div>
        <div className="sw-muted" style={{ fontSize: 13, marginTop: 2 }}>14 walks this month · 12.4 km total</div>
      </div>

      <div style={{ padding: '0 16px 100px', flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {walks.map((w, i) => (
            <div key={i} className="sw-card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'var(--purple-50)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon.Walk size={22} color="var(--purple-600)"/>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{w.dest}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-text)', marginTop: 2 }}>
                    {w.date} · {w.dur} · {w.dist}
                  </div>
                </div>
                <Badge variant={w.variant}>{w.status}</Badge>
              </div>
            </div>
          ))}
        </div>

        <button className="sw-btn sw-btn-ghost sw-btn-block" style={{ marginTop: 14 }}>Load more</button>
      </div>

      <TabBar active="history"/>
    </Screen>
  );
}

function SettingsScreen() {
  return (
    <Screen bg="var(--gray-bg)">
      <StatusBar/>
      <div style={{ padding: '12px 20px 12px' }}>
        <div className="sw-h1">Settings</div>
      </div>

      <div style={{ padding: '0 16px 100px', flex: 1, overflowY: 'auto' }}>
        {/* Profile card */}
        <div className="sw-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <Avatar initials="AJ" size={56}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Alex Johnson</div>
            <div style={{ fontSize: 12, color: 'var(--gray-text)' }}>alex@safewalk.app</div>
          </div>
          <button className="sw-btn sw-btn-ghost" style={{ height: 36, padding: '0 14px', fontSize: 13 }}>Edit</button>
        </div>

        {/* Notifications */}
        <div className="sw-section">Notifications</div>
        <div className="sw-card" style={{ padding: 0 }}>
          <SettingRow label="Check-in reminders" sub="In-app countdown during walks" on/>
          <SettingRow label="Walk summary" sub="Toast when a walk ends" on isLast/>
        </div>

        {/* Privacy */}
        <div className="sw-section">Privacy</div>
        <div className="sw-card" style={{ padding: 0 }}>
          <SettingRow label="Location only during walks" sub="Background tracking is never used" on disabled/>
          <SettingRow label="Auto-delete after 30 days" sub="Walks &amp; location data" on/>
          <SettingLink label="Privacy policy" isLast/>
        </div>

        {/* Data */}
        <div className="sw-section">Your data</div>
        <div className="sw-card" style={{ padding: 0 }}>
          <SettingLink label="Export my data" icon={<Icon.Download size={18} color="var(--gray-text)"/>}/>
          <SettingLink label="Delete all my data" danger isLast/>
        </div>

        {/* App info */}
        <div style={{ textAlign: 'center', marginTop: 24, color: 'var(--gray-text)', fontSize: 12 }}>
          SafeWalk v1.0.0 · PIPEDA compliant
        </div>
        <button className="sw-btn sw-btn-block" style={{ background: 'transparent', color: 'var(--red-text)', marginTop: 12 }}>
          <Icon.Logout size={16} color="var(--red-text)"/> Sign out
        </button>
      </div>

      <TabBar active="settings"/>
    </Screen>
  );
}

function SettingRow({ label, sub, on, disabled, isLast }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '14px 16px',
      borderBottom: isLast ? 'none' : '1px solid var(--gray-border)',
      gap: 12,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: disabled ? 'var(--gray-text)' : 'var(--dark)' }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--gray-text)', marginTop: 2 }}>{sub}</div>}
      </div>
      <Toggle on={on}/>
    </div>
  );
}

function SettingLink({ label, sub, danger, isLast, icon }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '14px 16px',
      borderBottom: isLast ? 'none' : '1px solid var(--gray-border)',
      gap: 12, cursor: 'pointer',
    }}>
      {icon}
      <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: danger ? 'var(--red-text)' : 'var(--dark)' }}>{label}</div>
      <Icon.Chevron color="var(--gray-text)"/>
    </div>
  );
}

// Public Track page (trusted contact view, no login)
function TrackScreen() {
  return (
    <Screen bg="white">
      <StatusBar dark/>
      {/* Purple header */}
      <div style={{ background: 'linear-gradient(135deg, var(--purple-400), var(--purple-600))', padding: '12px 18px 18px', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Logo size="sm"/>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.2 }}>SafeWalk</div>
          <span style={{
            marginLeft: 'auto', fontSize: 10, fontWeight: 700,
            background: 'rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: 999,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7CE05F' }}/>
            LIVE
          </span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.3 }}>Alex started a walk</div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>Shared with you · 8 minutes ago</div>
      </div>

      {/* Map */}
      <div style={{ height: 280, position: 'relative', flexShrink: 0 }}>
        <MapCanvas>
          <RouteLine points="55,200 195,200 195,90"/>
          <UserPin x="50%" y="55%"/>
        </MapCanvas>
        <div style={{
          position: 'absolute', top: 12, left: 12,
          background: 'white', padding: '6px 10px', borderRadius: 999,
          fontSize: 11, fontWeight: 600, color: 'var(--gray-text)',
          display: 'flex', alignItems: 'center', gap: 6,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }}/>
          Updated just now
        </div>
      </div>

      {/* Info rows */}
      <div style={{ padding: '14px 18px', flex: 1, overflowY: 'auto' }}>
        <InfoRow label="Last location" value="156 Portage Ave, Winnipeg" />
        <InfoRow label="Heading" value="North-east · 4.5 km/h" />
        <InfoRow label="Walk started" value="9:32 AM (8 min ago)" />
        <InfoRow label="Link expires" value="In 23h 52m" isLast/>

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button className="sw-btn sw-btn-primary" style={{ flex: 1 }}>
            <Icon.Phone color="white" size={16}/> Call Alex
          </button>
          <button className="sw-btn sw-btn-danger" style={{ flex: 1 }}>
            <Icon.Phone color="white" size={16}/> Call 911
          </button>
        </div>

        <div style={{
          marginTop: 16, padding: '12px 14px',
          background: 'var(--gray-bg)', borderRadius: 12,
          fontSize: 12, color: 'var(--gray-text)', lineHeight: 1.5,
        }}>
          You received this link because Alex listed you as a trusted contact. SafeWalk shares live location only during active walks.
        </div>
      </div>
    </Screen>
  );
}

function InfoRow({ label, value, isLast }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 0',
      borderBottom: isLast ? 'none' : '1px solid var(--gray-border)',
    }}>
      <div style={{ fontSize: 12, color: 'var(--gray-text)', fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, textAlign: 'right' }}>{value}</div>
    </div>
  );
}

Object.assign(window, { ContactsScreen, AddContactScreen, HistoryScreen, SettingsScreen, TrackScreen });
